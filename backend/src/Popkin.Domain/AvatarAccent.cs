namespace Popkin.Domain;

/// <summary>
/// The colour behind a person's initials. It comes from their id alone, so a person without a
/// photo keeps one colour everywhere they appear (L2-013 AC6).
/// </summary>
public static class AvatarAccent
{
    private static readonly PopkinColour[] Colours = Enum.GetValues<PopkinColour>();

    public static PopkinColour For(Guid personId)
    {
        // Guid.GetHashCode may differ between runtimes; the bytes do not.
        var sum = 0;
        foreach (var part in personId.ToByteArray())
        {
            sum += part;
        }

        return Colours[sum % Colours.Length];
    }
}
