using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Popkin.Api.Auth;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Every admin endpoint requires the admin session, never the Popkin app's (L2-078 AC3).</summary>
[ApiController]
[Authorize(AuthenticationSchemes = AdminSessionCookie.Scheme)]
public abstract class AdminControllerBase : ControllerBase;
