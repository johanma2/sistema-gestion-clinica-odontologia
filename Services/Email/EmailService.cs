using System.Net;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace SmileTrack_MVC.Services.Email;

public class EmailService(IOptions<EmailServiceOptions> options, ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailServiceOptions _options = options.Value;
    private readonly ILogger<EmailService> _logger = logger;

    public async Task SendRecoveryCodeAsync(string recipientEmail, string code, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            throw new ArgumentException("El destinatario es obligatorio.", nameof(recipientEmail));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("El código es obligatorio.", nameof(code));
        }

        if (string.IsNullOrWhiteSpace(_options.Host) ||
            _options.Port <= 0 ||
            string.IsNullOrWhiteSpace(_options.Username) ||
            string.IsNullOrWhiteSpace(_options.Password))
        {
            throw new InvalidOperationException("La configuracion SMTP no esta completa en appsettings.Local.json.");
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("SmileTrack", _options.Username));
        message.To.Add(new MailboxAddress(recipientEmail, recipientEmail));
        message.Subject = "SmileTrack — Código para restablecer tu contraseña";
        var codigoSeguro = WebUtility.HtmlEncode(code.Trim());

        var bodyBuilder = new BodyBuilder
        {
            TextBody = $"""
Hola,

Recibimos una solicitud para restablecer la contraseña de tu cuenta en SmileTrack.

Tu codigo de verificacion es:

{code}

Este codigo es valido durante 15 minutos a partir de este momento. Ingresalo en la pantalla de recuperacion de contrasena para continuar con el proceso.

Si tu no solicitaste este cambio, puedes ignorar este correo con tranquilidad: tu contrasena actual seguira funcionando sin cambios. Sin embargo, si esto ocurre repetidamente, te recomendamos cambiar tu contrasena por precaucion.

Por tu seguridad, nunca compartas este codigo con nadie, ni siquiera con personal de SmileTrack.

SmileTrack | Sistema de Gestion Odontologica
Este es un mensaje automatico, por favor no respondas a este correo.
""",
            HtmlBody = $"""
<html>
  <body style="margin:0;padding:24px;background-color:#f4f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="padding:24px 24px 12px 24px;background:#0f766e;color:#ffffff;">
        <h1 style="margin:0;font-size:22px;">SmileTrack</h1>
        <p style="margin:8px 0 0 0;font-size:14px;">Codigo para restablecer tu contrasena</p>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px 0;">Hola,</p>
        <p style="margin:0 0 16px 0;">
          Recibimos una solicitud para restablecer la contrasena de tu cuenta en SmileTrack.
        </p>
        <p style="margin:0 0 12px 0;">Tu codigo de verificacion es:</p>
        <div style="margin:0 0 20px 0;padding:16px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;background:#f8fafc;border:1px dashed #94a3b8;border-radius:10px;">
          {codigoSeguro}
        </div>
        <p style="margin:0 0 16px 0;">
          Este codigo es valido durante <strong>15 minutos</strong> a partir de este momento.
          Ingresalo en la pantalla de recuperacion de contrasena para continuar con el proceso.
        </p>
        <p style="margin:0 0 16px 0;">
          Si tu no solicitaste este cambio, puedes ignorar este correo con tranquilidad; tu contrasena actual seguira funcionando sin cambios.
          Sin embargo, si esto ocurre repetidamente, te recomendamos cambiar tu contrasena por precaucion.
        </p>
        <p style="margin:0 0 16px 0;">
          Por tu seguridad, nunca compartas este codigo con nadie, ni siquiera con personal de SmileTrack.
        </p>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
        SmileTrack | Sistema de Gestion Odontologica<br />
        Este es un mensaje automatico, por favor no respondas a este correo.
      </div>
    </div>
  </body>
</html>
"""
        };

        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(_options.Host, _options.Port, _options.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None, cancellationToken);
        await client.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}

public class EmailServiceOptions
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
