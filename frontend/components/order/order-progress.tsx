const STEPS = ["Выбор места", "Пассажиры", "Оплата"] as const;

export function OrderProgress({ activeStep = 0 }: { activeStep?: number }) {
  return (
    <ol aria-label="Этапы оформления" className="flex w-[600px] items-center gap-3">
      {STEPS.map((step, index) => (
        <li key={step} className="contents">
          <span
            data-order-progress-step
            aria-current={index === activeStep ? "step" : undefined}
            className={
              "shrink-0 rounded-full px-4 py-3 text-db-button transition-colors duration-300 ease-db " +
              (index <= activeStep
                ? "bg-db-button-primary-bg text-db-text-primary"
                : "bg-db-surface-default text-db-text-tertiary")
            }
          >
            {step}
          </span>

          {index < STEPS.length - 1 ? (
            <span className="h-px flex-1 border-t border-dashed border-db-border-default" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
