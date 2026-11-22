import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {
  cellPlainText,
  type TCellRun,
  type TLessonTable,
  type TTablesExerciseData,
} from '../../../lesson-editor/ui/editors/tablesModel';
import {ExHeader} from '../ExHeader';
import {ImageGallery} from '../ImageGallery';

type Props = {data: any};

function Runs({runs}: {runs: TCellRun[]}) {
  const visible = (runs || []).filter(run => run.text);
  if (!visible.length) {
    return <Text style={styles.cellText}>{'\u00a0'}</Text>;
  }
  return (
    <Text style={styles.cellText}>
      {visible.map((run, index) => {
        const style: {
          fontWeight?: '700' | '400';
          fontStyle?: 'italic' | 'normal';
          textDecorationLine?: 'underline' | 'none';
          color?: string;
        } = {};
        if (run.bold) {
          style.fontWeight = '700';
        }
        if (run.italic) {
          style.fontStyle = 'italic';
        }
        if (run.underline) {
          style.textDecorationLine = 'underline';
        }
        if (run.color) {
          style.color = run.color;
        }
        return (
          <Text key={index} style={style}>
            {run.text}
          </Text>
        );
      })}
    </Text>
  );
}

function TableFigure({table}: {table: TLessonTable}) {
  const rows = table.rows || [];
  if (!rows.length) {
    return null;
  }
  return (
    <View style={styles.figure}>
      {!!table.caption?.trim() && (
        <Text style={styles.caption}>{table.caption}</Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.table}>
          {rows.map((row, rowIndex) => {
            const isHead = !!table.headerRow && rowIndex === 0;
            return (
              <View
                key={`${table.id}-r${rowIndex}`}
                style={[styles.row, isHead && styles.headRow]}>
                {row.map((cell, colIndex) => (
                  <View
                    key={`${table.id}-c${rowIndex}-${colIndex}`}
                    style={[styles.cell, isHead && styles.headCell]}>
                    {cellPlainText(cell).trim() ? (
                      <Runs runs={cell.runs} />
                    ) : (
                      <Text style={styles.cellText}>{'\u00a0'}</Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function TablesExView({data}: Props) {
  const normalized = data as TTablesExerciseData;
  const tables = normalized?.tables || [];
  const images =
    Array.isArray(normalized?.images) && normalized.images.length
      ? [normalized.images[0]]
      : [];

  return (
    <View style={styles.root}>
      <ExHeader
        title={normalized?.title}
        titleColor={normalized?.titleColor}
        subtitle={normalized?.subtitle}
        description={normalized?.description}
      />
      {!!images.length && <ImageGallery images={images} />}
      <View style={styles.stack}>
        {tables.map(table => (
          <TableFigure key={table.id} table={table} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 16,
  },
  stack: {
    marginTop: 12,
    gap: 22,
  },
  figure: {
    gap: 8,
  },
  caption: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  scrollContent: {
    minWidth: '100%',
  },
  table: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.12)',
    backgroundColor: colors.white,
    minWidth: 280,
  },
  row: {
    flexDirection: 'row',
  },
  headRow: {
    backgroundColor: '#F4F1FF',
  },
  cell: {
    minWidth: 88,
    maxWidth: 220,
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E6E2F2',
  },
  headCell: {
    backgroundColor: '#F4F1FF',
  },
  cellText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
});
