using Popkin.Application;
using Popkin.Infrastructure;

// Background jobs are registered here as they are designed; the scaffold hosts none.
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

await builder.Build().RunAsync();
