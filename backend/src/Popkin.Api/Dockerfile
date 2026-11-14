# The popkin-api image (ADR 0013), built with `backend/` as the context:
#   docker build -f backend/src/Popkin.Api/Dockerfile backend
# The API runs from /app; the `popkin` tool is published beside it in /app/cli and runs
# `popkin migrate` as a release step before the new API starts (ADR 0018).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/ src/
RUN dotnet publish src/Popkin.Api/Popkin.Api.csproj -c Release -o /out/api \
 && dotnet publish src/Popkin.Cli/Popkin.Cli.csproj -c Release -o /out/cli

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out/api ./
COPY --from=build /out/cli ./cli/
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Popkin.Api.dll"]
