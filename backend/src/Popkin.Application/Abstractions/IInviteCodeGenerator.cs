namespace Popkin.Application.Abstractions;

/// <summary>Draws an unguessable invite code of at least 8 characters (L2-011 AC5).</summary>
public interface IInviteCodeGenerator
{
    string NewCode();
}
