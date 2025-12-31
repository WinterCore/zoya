import {Card} from "@/components/ui/Card";
import {AsyncData} from "@/lib/asyncdata";
import {formatDate} from "@/lib/format";
import {useTheme} from "@react-navigation/native";
import React, {useRef, useState} from "react";
import {ActivityIndicator, ScrollView, Text, View} from "react-native";

interface BatteryChartSlot {
  slot: number;
  percentage: number;
}

interface BatteryChartProps {
  data: AsyncData<BatteryChartSlot[]>;
  selectedDate: Date;
}

export function BatteryChart({data, selectedDate}: BatteryChartProps) {
  const theme = useTheme();
  const chartRef = useRef<ScrollView>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const isLoading = data.type === "loading" || (data.type === "success" && data.isLoading);

  return (
    <Card style={{margin: 16, padding: 24, marginTop: 0}}>
      <Text style={{fontSize: 22, color: "white", fontWeight: 500}}>Battery Levels</Text>
      <Text style={{color: "hsl(210 15% 65%)", marginTop: 4}}>
        Hourly battery percentage for {formatDate(selectedDate)}
      </Text>

      {isLoading && (
        <View style={{height: 300, justifyContent: "center", alignItems: "center", display: "flex"}}>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{marginTop: 32}} />
        </View>
      )}

      {data.type === "success" && !data.isLoading && (
        <View style={{marginTop: 24}}>
          {/* Y-axis labels */}
          <View style={{flexDirection: "row", marginBottom: 8}}>
            <View style={{width: 40, justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 8, height: 200}}>
              <Text style={{color: "hsl(210 15% 65%)", fontSize: 10, minWidth: 40, textAlign: "right"}}>100%</Text>
              <Text style={{color: "hsl(210 15% 65%)", fontSize: 10, minWidth: 40, textAlign: "right"}}>75%</Text>
              <Text style={{color: "hsl(210 15% 65%)", fontSize: 10, minWidth: 40, textAlign: "right"}}>50%</Text>
              <Text style={{color: "hsl(210 15% 65%)", fontSize: 10, minWidth: 40, textAlign: "right"}}>25%</Text>
              <Text style={{color: "hsl(210 15% 65%)", fontSize: 10, minWidth: 40, textAlign: "right"}}>0%</Text>
            </View>

            {/* Scrollable chart area */}
            <View
              style={{flex: 1, borderLeftWidth: 1, borderColor: "hsl(210 15% 30%)"}}
              onLayout={(e) => {
                const viewportWidth = e.nativeEvent.layout.width;
                setChartWidth(viewportWidth);
                // Scroll to show current time at right edge
                const barWidth = viewportWidth / 36 + 2; // bar width + margins
                const now = new Date();
                const currentSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
                // Calculate how many bars fit in viewport
                const barsInViewport = Math.floor(viewportWidth / barWidth);
                // Scroll so current slot is at the right edge
                const scrollX = Math.max(0, (currentSlot - barsInViewport + 1) * barWidth);
                setTimeout(() => {
                  chartRef.current?.scrollTo({x: scrollX, animated: false});
                }, 0);
              }}
            >
              <ScrollView
                ref={chartRef}
                horizontal
                showsHorizontalScrollIndicator={true}
              >
                <View>
                  {/* Bars */}
                  <View style={{flexDirection: "row", alignItems: "flex-end", height: 200, borderBottomWidth: 1, borderColor: "hsl(210 15% 30%)"}}>
                    {data.data.map((item) => (
                      <View
                        key={item.slot}
                        style={{
                          width: chartWidth / 36,
                          height: `${item.percentage}%`,
                          backgroundColor: item.percentage > 0 ? "#26d968" : "transparent",
                          borderRadius: 2,
                          minHeight: item.percentage > 0 ? 2 : 0,
                          marginHorizontal: 1,
                        }}
                      />
                    ))}
                  </View>
                  {/* X-axis labels */}
                  <View style={{flexDirection: "row"}}>
                    {Array.from({length: 24}, (_, hour) => {
                      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      const ampm = hour < 12 ? "am" : "pm";
                      return (
                        <View key={hour} style={{width: (chartWidth / 36) * 4 + 8}}>
                          {hour > 0 && (
                            <Text style={{color: "hsl(210 15% 65%)", fontSize: 10, marginTop: 4, marginLeft: -8}}>
                              {hour12}{ampm}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
          <Text style={{color: "hsl(210 15% 65%)", fontSize: 12, textAlign: "center", marginTop: 4}}>
            Hour of Day (scroll for more)
          </Text>
        </View>
      )}
    </Card>
  );
}
