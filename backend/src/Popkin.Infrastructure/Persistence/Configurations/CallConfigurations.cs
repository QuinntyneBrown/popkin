using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class CallConfiguration : IEntityTypeConfiguration<Call>
{
    public void Configure(EntityTypeBuilder<Call> builder)
    {
        builder.ToTable("Calls");
        builder.HasKey(c => c.Id);
        // Two changes to who is on a call cannot both be saved from the same version.
        builder.Property(c => c.Version).IsConcurrencyToken();
        // One group call under way per Popkin, and one direct call under way per direct message;
        // the two kinds run at once.
        builder.HasIndex(c => c.PopkinId).IsUnique().HasFilter("[EndedAt] IS NULL AND [ThreadId] IS NULL");
        builder.HasIndex(c => c.ThreadId).IsUnique().HasFilter("[EndedAt] IS NULL AND [ThreadId] IS NOT NULL");
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(c => c.PopkinId).OnDelete(DeleteBehavior.Cascade);
        // A thread goes with its Popkin, which takes its calls already.
        builder.HasOne<ChatThread>().WithMany().HasForeignKey(c => c.ThreadId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class CallParticipantConfiguration : IEntityTypeConfiguration<CallParticipant>
{
    public void Configure(EntityTypeBuilder<CallParticipant> builder)
    {
        builder.ToTable("CallParticipants");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.ConnectionId).HasMaxLength(64);
        // A member is on a call once at a time.
        builder.HasIndex(p => new { p.CallId, p.MembershipId }).IsUnique().HasFilter("[LeftAt] IS NULL");
        // A dropped connection finds the participant it carried.
        builder.HasIndex(p => p.ConnectionId);
        builder.HasOne<Call>().WithMany().HasForeignKey(p => p.CallId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(p => p.MembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}
