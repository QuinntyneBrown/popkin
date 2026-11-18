using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>Who may change and publish holiday calendars, one case per role (L2-197 AC5, L2-086).</summary>
public sealed class HolidayPermissionsTests
{
    [Theory]
    [InlineData(AdminRole.Owner, true)]
    [InlineData(AdminRole.Support, true)]
    [InlineData(AdminRole.Viewer, false)]
    public void Owners_and_support_change_holiday_calendars(AdminRole role, bool allowed) =>
        Assert.Equal(allowed, AdminPermissions.Allows(role, AdminAction.ChangeHolidayCalendars));
}
