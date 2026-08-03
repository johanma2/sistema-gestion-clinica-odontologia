namespace SmileTrack_MVC.Services.Email;

public interface IEmailService
{
    Task SendRecoveryCodeAsync(string recipientEmail, string code, CancellationToken cancellationToken = default);
}
