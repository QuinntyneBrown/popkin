namespace Popkin.Application.Popkins;

/// <summary>
/// Builds an invite link from `Invites:BaseUrl` and the code. The mocks show `popk.in/{code}`;
/// how the production address reaches the app's `/i/:code` is `&lt;TO SUPPLY&gt;`.
/// </summary>
public sealed class InviteLinkBuilder(string baseUrl)
{
    public string Build(string code) => $"{baseUrl.TrimEnd('/')}/{code}";
}
