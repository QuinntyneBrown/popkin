using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Import;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>Import from your Popkins (L1-038): only the caller's own Popkins are read, and nobody is told (L2-122).</summary>
[ApiController]
[Route("api/contacts/import")]
public sealed class ContactsImportController(ISender sender) : ControllerBase
{
    /// <summary>Everyone the caller shares a Popkin with, once each (L2-151 AC1, AC2).</summary>
    [HttpGet]
    public Task<ImportCandidatesDto> Candidates(CancellationToken cancellationToken) =>
        sender.Send(new GetImportCandidatesQuery(), cancellationToken);

    /// <summary>"Import {n} people" (L2-151 AC4); a resend under the same client id imports nobody more.</summary>
    [HttpPost]
    public Task<ImportResultDto> Import(ImportContactsRequest import, CancellationToken cancellationToken) =>
        sender.Send(new ImportContactsCommand(import), cancellationToken);
}
