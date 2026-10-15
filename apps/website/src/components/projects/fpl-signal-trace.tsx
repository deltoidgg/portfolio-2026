const steps = [
  {
    title: "Collect",
    detail: "FPL prices, fixtures and availability, plus match odds and goal lines.",
  },
  {
    title: "Keep the raw copy",
    detail: "Every response is compressed, named by its hash and stored untouched.",
  },
  {
    title: "Line it up",
    detail: "Players, teams and fixtures get stable IDs so the sources agree.",
  },
  {
    title: "Forecast",
    detail: "Odds become goal rates, then a points range for every player.",
  },
  {
    title: "Publish",
    detail: "The squad lab and map read one checked, published snapshot.",
  },
] as const;

export function FplSignalTrace() {
  return (
    <figure className="case-figure case-figure--wide">
      <ol className="pipeline" aria-label="How a forecast is made">
        {steps.map((step) => (
          <li key={step.title} className="pipeline__step">
            <strong>{step.title}</strong>
            <span>{step.detail}</span>
          </li>
        ))}
      </ol>
      <figcaption>
        How a number gets from a bookmaker to the squad lab. Each forecast run keeps an ID for the
        exact inputs and code that produced it.
      </figcaption>
    </figure>
  );
}
