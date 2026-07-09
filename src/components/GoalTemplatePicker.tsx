export type GoalTemplate = {
  title: string;
  grapeCount: number;
};

const goalTemplates: GoalTemplate[] = [
  { title: "운동 30일", grapeCount: 30 },
  { title: "말씀 묵상 30일", grapeCount: 30 },
  { title: "독서 10권", grapeCount: 10 },
  { title: "영어 공부 100일", grapeCount: 100 },
];

type GoalTemplatePickerProps = {
  onSelect: (template: GoalTemplate) => void;
};

export function GoalTemplatePicker({ onSelect }: GoalTemplatePickerProps) {
  return (
    <div className="mt-4">
      <p className="text-sm font-bold text-[#604c5a]">추천 목표</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {goalTemplates.map((template) => (
          <button
            className="min-h-11 rounded-[8px] bg-[#fff8f3] px-3 py-2 text-left text-sm font-black leading-5 text-[#6f2c83] ring-1 ring-[#ead8d0] transition active:scale-[0.99]"
            key={template.title}
            onClick={() => onSelect(template)}
            type="button"
          >
            {template.title}
          </button>
        ))}
      </div>
    </div>
  );
}
