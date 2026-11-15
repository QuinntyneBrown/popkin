using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Administration;

/// <summary>The counts beside the sidebar's sections (admin shell design).</summary>
public sealed class AdminWaitingTests
{
    // Given one album export that failed and one being prepared, when any admin reads what is
    // waiting, then failed exports is 1, and reports and failed jobs are 0 until those exist.
    [Fact]
    public async Task Any_admin_reads_what_is_waiting()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var failed = AlbumExport.Request(Guid.NewGuid(), Guid.NewGuid(), 3, api.Clock.GetUtcNow());
            failed.Fail();
            db.AlbumExports.AddRange(failed, AlbumExport.Request(Guid.NewGuid(), Guid.NewGuid(), 3, api.Clock.GetUtcNow()));
            await db.SaveChangesAsync();
        }

        var waiting = await viewer.GetFromJsonAsync<JsonElement>("/api/admin/waiting");

        Assert.Equal(0, waiting.GetProperty("reports").GetInt32());
        Assert.Equal(0, waiting.GetProperty("failedJobs").GetInt32());
        Assert.Equal(1, waiting.GetProperty("failedExports").GetInt32());
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync("/api/admin/waiting")).StatusCode);
    }
}
