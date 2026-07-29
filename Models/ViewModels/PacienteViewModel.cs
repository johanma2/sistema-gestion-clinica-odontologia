namespace SmileTrack_MVC.Models.ViewModels;

public class PacienteViewModel
{
    public int Id { get; set; }
    public string Initials { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Doc { get; set; } = string.Empty;
    public DateTime? LastVisit { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public DateTime? NextVisit { get; set; }
    public List<string> Allergies { get; set; } = [];
    public string Color { get; set; } = "blue";
    public List<PacienteHistorialViewModel> History { get; set; } = [];
}

public class PacienteHistorialViewModel
{
    public DateTime Date { get; set; }
    public string Procedure { get; set; } = string.Empty;
    public string Doctor { get; set; } = string.Empty;
}
