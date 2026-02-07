interface InputGuidanceProps {
  maxInputCount: number;
}

export function InputGuidance({ maxInputCount }: InputGuidanceProps) {
  return (
    <>
      支持逗号、空格、中文逗号分隔；可输入负数和小数。建议输入 3~{maxInputCount}
      个数字；少于 3 个也可运行，超过 {maxInputCount} 个将无法运行。
    </>
  );
}
