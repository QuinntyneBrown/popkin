using System.Text.RegularExpressions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Auth;

/// <summary>
/// Normalises and checks a phone number or email (L2-003 AC4, AC5). Numbers are read as North
/// American, as the mocks show; the default region and international numbers are `&lt;TO SUPPLY&gt;`.
/// </summary>
public static partial class ContactRules
{
    public static string Normalise(ContactChannel channel, string? value)
    {
        value ??= "";
        if (channel == ContactChannel.Phone)
        {
            var digits = new string(value.Where(char.IsAsciiDigit).ToArray());
            if (digits.Length == 11 && digits[0] == '1')
            {
                digits = digits[1..];
            }

            if (digits.Length != 10)
            {
                throw ProblemException.Invalid("phone_invalid", "That number looks a digit short.", "destination");
            }

            return $"+1{digits}";
        }

        var email = value.Trim().ToLowerInvariant();
        if (email.Length > 254 || !Email().IsMatch(email))
        {
            throw ProblemException.Invalid("email_invalid", "That email doesn't look quite right.", "destination");
        }

        return email;
    }

    /// <summary>All but the last two digits of a phone number are masked (L2-004 AC1).</summary>
    public static string Display(ContactChannel channel, string destination) =>
        channel == ContactChannel.Phone ? $"(•••) •••-••{destination[^2..]}" : destination;

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")]
    private static partial Regex Email();
}
