using Popkin.Application.Problems;

namespace Popkin.Application.Contacts;

/// <summary>
/// Whether Contacts is open (ADR 0023): off unless `Features:Contacts` is <c>true</c>. Every
/// Contacts handler asks first, so a switched-off API answers 404 `feature_off` and nothing else.
/// </summary>
public sealed record ContactsSwitch(bool On)
{
    public void Require()
    {
        if (!On)
        {
            throw new ProblemException(404, "feature_off", "Contacts is switched off.");
        }
    }
}
