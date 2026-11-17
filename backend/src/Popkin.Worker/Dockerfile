# The popkin-worker image (ADR 0013), built with `backend/` as the context:
#   docker build -f backend/src/Popkin.Worker/Dockerfile backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/ src/
RUN dotnet publish src/Popkin.Worker/Popkin.Worker.csproj -c Release -o /out/worker

# ASP.NET Core's runtime: notification emails are rendered with Razor components (ADR 0031).
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out/worker ./
USER $APP_UID
ENTRYPOINT ["dotnet", "Popkin.Worker.dll"]
