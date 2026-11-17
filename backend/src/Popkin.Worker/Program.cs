using Popkin.Worker;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddWorker(builder.Configuration, builder.Environment);

await builder.Build().RunAsync();
