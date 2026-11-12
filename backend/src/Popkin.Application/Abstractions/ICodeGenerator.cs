namespace Popkin.Application.Abstractions;

/// <summary>Draws six random digits for a verification code.</summary>
public interface ICodeGenerator
{
    string NewCode();
}
