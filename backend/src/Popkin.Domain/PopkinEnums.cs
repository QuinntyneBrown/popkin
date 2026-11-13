namespace Popkin.Domain;

/// <summary>One of the seven accents a Popkin carries.</summary>
public enum PopkinColour
{
    Coral,
    Teal,
    Sky,
    Berry,
    Leaf,
    Plum,
    Amber,
}

/// <summary>How long a Popkin lasts (L2-009 AC1).</summary>
public enum PopkinLength
{
    JustToday,
    TheWeekend,
    UntilDate,
    KeepItGoing,
}

public enum PopkinStatus
{
    Active,
    WrappedUp,
}

public enum MembershipRole
{
    Host,
    Member,
}

public enum ChatThreadKind
{
    Everyone,
    Direct,
}
