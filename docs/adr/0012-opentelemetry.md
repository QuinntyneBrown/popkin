# 0012. Telemetry: OpenTelemetry for logs, metrics and traces

## Status

Accepted, 13 November 2026.

## Context

`UnexpectedExceptionHandler` gives every server failure a reference code and writes it to the
log; that helps only if someone can search the log. The requirements make promises in numbers
(L2-055 AC3, L2-027 AC1, L2-044 AC1, L2-053) that nothing measures once the code runs. The API
and the Worker will need to be read together: a wrap-up starts in one and is pushed by the other.
The designs left the logging sink as `<TO SUPPLY>`, and
[Fast screens](../detailed-designs/reliability/fast-screens/README.md) already names
OpenTelemetry for the request-duration metric.

## Decision

- The API and the Worker report logs, metrics and traces through **OpenTelemetry**.
- **One set-up, in `Popkin.Infrastructure`.** `AddPopkinTelemetry(serviceName)` configures the
  resource, OpenTelemetry logging, the runtime and `Popkin` meters, the `Popkin` activity source
  and the exporter. The API adds its own ASP.NET Core instrumentation, because Infrastructure
  does not reference ASP.NET Core. No project is added for it.
- **Export is switched on by configuration alone.** The OTLP exporter is registered only when
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Without it nothing is exported and the console log is
  unchanged. The same binary reports to any backend that accepts OTLP; the backend and its
  retention are `<TO SUPPLY>` and need no code.
- **Popkin's own measurements are `System.Diagnostics.Metrics` instruments on one meter,
  `Popkin`**, declared in `PopkinMetrics` (`Popkin.Application`). No hand-rolled counters and no
  periodic log lines of totals. A design that states a number names the instrument that shows it.
- **What never enters a log record, a metric dimension or a span** (L2-054 AC3): a phone number,
  an email address, a six-digit code, an invite code, a session token or cookie, message text, a
  photo, a query string, a request or response body. A route is recorded as its template
  (`/api/invites/{code}`), never as the path requested. The health endpoints are left out of
  traces.
- **The reference code of a failure is on the active span** (`popkin.reference`) as well as in
  the log, so the code a person reads out finds the trace.

## Consequences

- Four packages enter `Directory.Packages.props`: `OpenTelemetry.Extensions.Hosting`,
  `OpenTelemetry.Exporter.OpenTelemetryProtocol`, `OpenTelemetry.Instrumentation.Runtime` and
  `OpenTelemetry.Instrumentation.AspNetCore`.
- With no endpoint configured, the cost is the instruments themselves, which is small.
- Dimensions are chosen from fixed sets (a policy name, a channel, a route template). A dimension
  whose values come from people (an id, an address) is a defect, both for privacy and for the
  number of series.
- The request log of `RequestLoggingMiddleware` stays: it is the rule of `AGENTS.md` on where
  request logging sits, and it is what a developer reads with no backend configured.
