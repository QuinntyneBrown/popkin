using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("Messages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Text).HasMaxLength(Message.MaxTextLength).IsRequired();
        builder.Property(m => m.Kind).HasConversion<string>().HasMaxLength(10);
        // Paging reads a thread by time, then id.
        builder.HasIndex(m => new { m.ThreadId, m.SentAt, m.Id });
        // One message per author and client message id, so a repeated send stores nothing twice.
        // System messages carry no client message id and are left out where the provider filters.
        builder.HasIndex(m => new { m.AuthorMembershipId, m.ClientMessageId }).IsUnique();
        builder.HasOne<ChatThread>().WithMany().HasForeignKey(m => m.ThreadId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(m => m.AuthorMembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ThreadReadStateConfiguration : IEntityTypeConfiguration<ThreadReadState>
{
    public void Configure(EntityTypeBuilder<ThreadReadState> builder)
    {
        builder.ToTable("ThreadReadStates");
        // One read point per member and thread.
        builder.HasKey(s => new { s.ThreadId, s.MembershipId });
        builder.HasIndex(s => s.MembershipId);
        builder.HasOne<ChatThread>().WithMany().HasForeignKey(s => s.ThreadId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(s => s.MembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}
