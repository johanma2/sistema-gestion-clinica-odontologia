namespace SmileTrack_MVC.Models.ViewModels;

public class GuiaPasoViewModel
{
    public int Number { get; set; }
    public string Title { get; set; } = string.Empty;
    public string DescriptionHtml { get; set; } = string.Empty;
}

public class GuiaUsuarioViewModel
{
    public string Title { get; set; } = "Cómo programar una cita";
    public string Introduction { get; set; } = "Aprende paso a paso cómo agendar una nueva cita en SmileTrack de forma correcta, asignando paciente, profesional, consultorio y servicio.";
    public string VideoAltText { get; set; } = "Tutorial de cómo programar una cita";
    public string VideoThumbnailUrl { get; set; } = "/images/tutorial-cita-thumb.jpg";
    public List<GuiaPasoViewModel> Steps { get; set; } = [];
    public List<string> RelatedTopics { get; set; } = [];
    public List<string> Tags { get; set; } = [];
}

// UsuarioViewModel 
public class UsuarioViewModel
{
    public string Initials { get; set; } = "ST";
    public string FullName { get; set; } = "Usuario SmileTrack";
    public string Email { get; set; } = "usuario@smiletrack.local";
}