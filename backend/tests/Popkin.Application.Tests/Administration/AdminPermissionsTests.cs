using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>The table of L2-086: one case per action and role.</summary>
public sealed class AdminPermissionsTests
{
    // Owner, Support, Viewer for each action, as the rows of L2-086 give them.
    [Theory]
    [InlineData(AdminAction.SuspendPerson, true, true, false)]
    [InlineData(AdminAction.SignPersonOut, true, true, false)]
    [InlineData(AdminAction.ExportPersonData, true, true, false)]
    [InlineData(AdminAction.LogDataRequest, true, true, false)]
    [InlineData(AdminAction.StartDeletion, true, false, false)]
    [InlineData(AdminAction.CancelDeletion, true, false, false)]
    [InlineData(AdminAction.WrapUpPopkin, true, true, false)]
    [InlineData(AdminAction.ExtendPopkin, true, true, false)]
    [InlineData(AdminAction.RemoveMember, true, true, false)]
    [InlineData(AdminAction.ResetInvite, true, true, false)]
    [InlineData(AdminAction.ReviewReports, true, true, false)]
    [InlineData(AdminAction.RemoveContent, true, true, false)]
    [InlineData(AdminAction.OpenModerationView, true, true, false)]
    [InlineData(AdminAction.EndCall, true, true, false)]
    [InlineData(AdminAction.RunJob, true, true, false)]
    [InlineData(AdminAction.RetryExport, true, true, false)]
    [InlineData(AdminAction.ChangeFeature, true, false, false)]
    [InlineData(AdminAction.ChangeLimits, true, false, false)]
    [InlineData(AdminAction.PublishAnnouncement, true, false, false)]
    [InlineData(AdminAction.ManageAdmins, true, false, false)]
    [InlineData(AdminAction.ExportAuditLog, true, true, true)]
    public void Each_role_may_take_the_actions_of_its_column(AdminAction action, bool owner, bool support, bool viewer)
    {
        Assert.Equal(owner, AdminPermissions.Allows(AdminRole.Owner, action));
        Assert.Equal(support, AdminPermissions.Allows(AdminRole.Support, action));
        Assert.Equal(viewer, AdminPermissions.Allows(AdminRole.Viewer, action));
    }

    [Fact]
    public void Every_action_is_in_one_row_of_the_table() =>
        Assert.Equal(
            Enum.GetValues<AdminAction>().Order(),
            AdminPermissions.Rows.SelectMany(r => r.Actions).Order());
}
