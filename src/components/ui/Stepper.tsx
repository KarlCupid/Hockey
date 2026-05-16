export interface StepperStep {
  id: string;
  label: string;
  completed: boolean;
}

export function Stepper({ steps }: { steps: StepperStep[] }) {
  return (
    <ol className="ui-stepper">
      {steps.map((step) => (
        <li key={step.id} className={step.completed ? "is-complete" : ""}>
          <span>{step.completed ? "Done" : "Next"}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}
