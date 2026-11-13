using Popkin.Application;
using Popkin.Application.Abstractions;
using Popkin.Infrastructure;
using Popkin.Worker;
using Popkin.Worker.Jobs;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);
// What the API gives the handlers and the Worker has none of: a hub and a signed-in person.
builder.Services.AddSingleton<IPopkinNotifier, SilentPopkinNotifier>();
builder.Services.AddSingleton<IPopkinConnections, NoPopkinConnections>();
builder.Services.AddScoped<ICurrentPerson, NoCurrentPerson>();

// Each job is the loop alone; its command's handler holds the rules.
builder.Services.AddHostedService<WrapUpDuePopkinsJob>();
builder.Services.AddHostedService<RemovePhotosOfWrappedUpPopkinsJob>();
builder.Services.AddHostedService<PrepareAlbumExportsJob>();
builder.Services.AddHostedService<PurgeDeletedAccountsJob>();

await builder.Build().RunAsync();
