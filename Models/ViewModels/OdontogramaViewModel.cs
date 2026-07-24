namespace SmileTrack_MVC.Models.ViewModels;

public class OdontogramaViewModel
{
    public int? PacienteId { get; set; }
    public int? HistoriaId { get; set; }
    public string PacienteNombre { get; set; } = "Paciente";
    public string CodigoHC { get; set; } = "HC-SIN-ASIGNAR";
    public string FechaNacimiento { get; set; } = "";
    public string ProfesionalNombre { get; set; } = "Profesional";
    public string ProfesionalCorreo { get; set; } = "";
    public string? ObservacionesGenerales { get; set; }
    public string? EstadoPersistido { get; set; }
}

public class OdontogramaGuardarRequest
{
    public int? PacienteId { get; set; }
    public Dictionary<string, OdontogramaRegistroPayload> Registros { get; set; } = new();
    public Dictionary<string, string> MapeoFDI { get; set; } = new();
}

public class OdontogramaRegistroPayload
{
    public string? NombrePieza { get; set; }
    public List<OdontogramaTratamientoPayload> Tratamientos { get; set; } = new();
}

public class OdontogramaTratamientoPayload
{
    public string? Key { get; set; }
    public string? Obs { get; set; }
    public string? Fecha { get; set; }
}
