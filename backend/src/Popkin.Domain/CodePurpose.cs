namespace Popkin.Domain;

/// <summary>Whether a code was requested from sign up, from sign in, or from the admin app's sign in.</summary>
public enum CodePurpose
{
    SignUp,
    SignIn,
    AdminSignIn,
}
