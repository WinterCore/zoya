import {LinearGradient} from "expo-linear-gradient";

interface Props {
  readonly children?: React.ReactNode;
}

export const ScreenBackground = (props: Props) => {
  return (
    <LinearGradient
      colors={['hsl(220, 20%, 8%)', 'hsl(220, 15%, 18%)', 'hsl(220, 20%, 8%)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {props.children}
    </LinearGradient>
  );
};
