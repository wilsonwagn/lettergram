import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');

interface MonthData {
  month: string;
  count: number;
}

interface Props {
  data: MonthData[];
}

export function MonthlyBar({ data }: Props) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const currentMonth = new Date().getMonth(); // 0-indexed

  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <View style={styles.container}>
      {data.map((item, idx) => {
        const barHeight = Math.max(item.count > 0 ? 4 : 0, (item.count / maxCount) * 80);
        const isCurrent = idx === currentMonth;
        const isTop = item.count === maxCount && maxCount > 0;

        return (
          <View key={item.month} style={styles.barWrap}>
            {isTop && item.count > 0 && (
              <Text style={styles.barCount}>{item.count}</Text>
            )}
            <View
              style={[
                styles.bar,
                { height: barHeight },
                isCurrent && styles.barCurrent,
                isTop && styles.barTop,
              ]}
            />
            <Text style={[styles.label, isCurrent && styles.labelCurrent]}>
              {item.month}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 112,
    paddingTop: 20,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barCount: {
    fontSize: Typography.xs,
    fontFamily: Typography.fontBold,
    color: Colors.accent,
    marginBottom: 2,
  },
  bar: {
    width: '80%',
    borderRadius: 3,
    backgroundColor: Colors.surface3,
    minHeight: 2,
  },
  barCurrent: {
    backgroundColor: 'rgba(204,255,0,0.4)',
  },
  barTop: {
    backgroundColor: Colors.accent,
  },
  label: {
    fontSize: 9,
    fontFamily: Typography.fontRegular,
    color: Colors.textMuted,
  },
  labelCurrent: {
    color: Colors.accent,
    fontFamily: Typography.fontSemiBold,
  },
});
