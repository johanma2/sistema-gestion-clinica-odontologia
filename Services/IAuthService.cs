using SmileTrack_MVC.Models.ViewModels;
using System.Threading.Tasks;

namespace SmileTrack_MVC.Services
{
    public interface IAuthService
    {
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task<AuthResponse> RegisterAsync(RegisterRequest request);
        Task<AuthResponse> RecoverPasswordAsync(RecoverPasswordRequest request);
        Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
