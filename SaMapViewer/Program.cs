using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SaMapViewer.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSingleton<PlayerTrackerService>();
builder.Services.AddSingleton<UnitsService>();
builder.Services.AddSingleton<SituationsService>();
builder.Services.AddSingleton<HistoryService>();
builder.Services.AddSingleton<TacticalChannelsService>();
builder.Services.Configure<SaOptions>(builder.Configuration.GetSection("SaMap"));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .AllowAnyOrigin();
    });
});

var app = builder.Build();

app.UseCors();
app.UseStaticFiles();
app.MapControllers();
app.MapHub<SaMapViewer.Hubs.CoordsHub>("/coordshub");

app.Run("http://localhost:5000");