import { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { Dropdown, IDropdownRef } from 'react-native-element-dropdown';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { FieldLabel } from './FieldLabel';

export type SelectFieldItem = {
  id: string;
  label: string;
  sublabel?: string;
  /** When any item carries this, items are segmented under uppercase group headers (sorted by first appearance). */
  group?: string;
};

type RowData = SelectFieldItem & { isHeader?: boolean };

const HEADER_PREFIX = '__group_header__:';

type SelectFieldProps = {
  label?: string;
  placeholder?: string;
  value: string | null;
  items: SelectFieldItem[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (id: string) => void;
};

/**
 * Field variant="picker"'s look, backed by react-native-element-dropdown
 * instead of a hand-rolled bottom sheet — anchored dropdown + built-in
 * search, still themed to match the rest of the kit (border, radius, type).
 * When items carry a `group`, renders uppercase section headers inline —
 * the library has no native SectionList mode, so headers are synthesized
 * as non-selectable rows in the same flat data array.
 */
export function SelectField({ label, placeholder = 'Select…', value, items, loading, disabled, onChange }: SelectFieldProps) {
  const { color, font, type: typeScale, radius, border } = useTheme();
  const isGrouped = items.some((item) => item.group);

  // Search is disabled once grouped: the library filters the flat array
  // (headers included) against the query, and a header can survive a
  // filter with none of its rows still matching — segmentation and free
  // search don't mix cleanly, so pick one. Browsing a segmented list is
  // the point here.
  const rows = useMemo<RowData[]>(() => {
    if (!isGrouped) return items;
    // Bucket by group first rather than trusting `items` to already be
    // sorted — otherwise an interleaved input produces the same header
    // repeated wherever its group resurfaces instead of one clean section.
    const order: string[] = [];
    const buckets = new Map<string, SelectFieldItem[]>();
    for (const item of items) {
      const group = item.group ?? 'Other';
      if (!buckets.has(group)) {
        buckets.set(group, []);
        order.push(group);
      }
      buckets.get(group)!.push(item);
    }
    const out: RowData[] = [];
    for (const group of order) {
      out.push({ id: HEADER_PREFIX + group, label: group, isHeader: true });
      out.push(...buckets.get(group)!);
    }
    return out;
  }, [items, isGrouped]);

  const dropdownRef = useRef<IDropdownRef>(null);

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Dropdown
        ref={dropdownRef}
        style={{
          borderWidth: border.base,
          borderColor: color.line,
          borderRadius: radius.sm,
          backgroundColor: color.panel,
          paddingVertical: 9,
          paddingHorizontal: 10,
          minHeight: 0,
        }}
        containerStyle={{
          borderRadius: radius.sm,
          borderWidth: border.base,
          borderColor: color.line,
          backgroundColor: color.panel,
          overflow: 'hidden',
        }}
        placeholderStyle={{ ...textStyle(typeScale.value), color: color.mute }}
        selectedTextStyle={{ ...textStyle(typeScale.value), color: color.ink }}
        itemTextStyle={{ ...textStyle(typeScale.body), color: color.ink }}
        itemContainerStyle={{ paddingHorizontal: 4 }}
        inputSearchStyle={{
          ...textStyle(typeScale.body),
          color: color.ink,
          borderRadius: radius.sm,
          borderColor: color.line,
        }}
        fontFamily={font.body}
        activeColor={color.derived}
        iconColor={color.mute}
        data={loading ? [] : rows}
        search={!isGrouped && items.length > 6}
        searchPlaceholder="Search…"
        labelField="label"
        valueField="id"
        value={value}
        placeholder={loading ? 'Loading…' : placeholder}
        disable={disabled || loading}
        maxHeight={340}
        // Header rows are still tappable inside the library's own row
        // wrapper (no per-row way to opt out of that). `confirmSelectItem`
        // routes every tap through onConfirmSelectItem instead of the
        // library's normal select-and-close path, so a header tap can be
        // silently ignored — closing (and the real selection) is then done
        // by hand only for a genuine item.
        confirmSelectItem
        onChange={() => {}}
        onConfirmSelectItem={(item: RowData) => {
          if (item.isHeader) return;
          onChange(item.id);
          dropdownRef.current?.close();
        }}
        renderRightIcon={() => <ChevronDown size={15} color={color.mute} />}
        renderItem={(item: RowData) =>
          item.isHeader ? (
            <View style={{ paddingTop: 14, paddingBottom: 6, paddingHorizontal: 8 }}>
              <Text style={{ ...textStyle(typeScale.body), color: color.ink, fontWeight: '700' }}>{item.label}</Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 10, paddingLeft: isGrouped ? 20 : 8, paddingRight: 8 }}>
              <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.label}</Text>
              {item.sublabel ? (
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 1 }}>{item.sublabel}</Text>
              ) : null}
            </View>
          )
        }
      />
    </View>
  );
}
