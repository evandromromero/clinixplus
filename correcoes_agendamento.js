// CORREÇÃO 1: Adicionar async à função updateServicesForEmployee
// Linha 512
const updateServicesForEmployee = async (employeeId, currentPackageId = null) => {
  // ...resto da função...
};

// CORREÇÃO 2: Modificar a renderização dos pacotes para exibir corretamente o nome
// Procure o trecho que renderiza os pacotes (por volta da linha 1638)
// Substitua por:
{clientPackages.map((pkg) => {
  // Usar o nome do pacote do cliente em vez de tentar buscar pelo package_id
  const packageData = packages.find(p => p.id === pkg.package_id);
  
  // Usar o nome diretamente do pacote do cliente ou do package_snapshot
  const packageName = pkg.name || (pkg.package_snapshot?.name) || packageData?.name || "Pacote sem nome";
  
  // Formatar a data de compra
  const purchaseDate = pkg.created_date 
    ? format(new Date(pkg.created_date), "dd/MM/yyyy")
    : "Data desconhecida";
  
  console.log(`[DEBUG] Renderizando pacote ${pkg.id}:`, {
    packageId: pkg.package_id,
    packageData: packageData,
    packageName: packageName,
    purchaseDate: purchaseDate,
    rawPackage: pkg
  });
  
  return (
    <SelectItem key={pkg.id} value={pkg.id}>
      {packageName} - {pkg.sessions_used}/{pkg.total_sessions} sessões ({purchaseDate})
    </SelectItem>
  );
})}

// CORREÇÃO 3: Modificar o tratamento de pacotes personalizados para acessar corretamente os serviços
// Na função updateServicesForEmployee, substitua o trecho que trata pacotes personalizados por:
if (isCustomPackage) {
  // Para pacotes personalizados, usar os serviços incluídos diretamente no pacote do cliente
  console.log("[DEBUG] Usando serviços do pacote personalizado");
  console.log("[DEBUG] Pacote completo:", selectedPackage);
  
  // Verificar se temos serviços no package_snapshot
  const packageSnapshot = selectedPackage.package_snapshot;
  console.log("[DEBUG] Package snapshot:", packageSnapshot);
  
  // Verificar diferentes locais onde os serviços podem estar armazenados
  let packageServices = [];
  
  // Opção 1: Serviços no package_snapshot.services (formato de array de objetos com service_id)
  if (packageSnapshot && packageSnapshot.services && Array.isArray(packageSnapshot.services)) {
    // Extrair os IDs de serviço do package_snapshot.services
    packageServices = packageSnapshot.services.map(s => s.service_id);
    console.log("[DEBUG] Serviços encontrados no package_snapshot:", packageServices);
  }
  // Opção 2: Serviços no array services do pacote
  else if (selectedPackage.services && selectedPackage.services.length > 0) {
    packageServices = selectedPackage.services;
    console.log("[DEBUG] Serviços encontrados no array services:", packageServices);
  }
  
  if (packageServices.length > 0) {
    console.log("[DEBUG] Serviços do pacote personalizado:", packageServices);
    
    // Filtrar serviços que estão no pacote E que o profissional pode realizar
    availableServices = services.filter(service => {
      // Verificar se o serviço está no pacote personalizado
      const serviceInPackage = packageServices.includes(service.id);
      // Verificar se o profissional pode realizar este serviço
      const canPerformService = employee.specialties.includes(service.id);
      
      console.log(`[DEBUG] Avaliando serviço personalizado ${service.name}:`, {
        id: service.id,
        serviceInPackage,
        canPerformService
      });
      
      return serviceInPackage && canPerformService;
    }).map(service => ({
      ...service,
      displayName: `${service.name} (Pacote: ${selectedPackage.name || packageSnapshot?.name || "Personalizado"})`
    }));
  } else {
    // Se não encontrarmos serviços em nenhum lugar, mostrar uma mensagem de aviso
    console.log("[DEBUG] Nenhum serviço encontrado no pacote personalizado");
    toast({
      title: "Aviso",
      description: "Este pacote não possui serviços definidos. Entre em contato com o administrador.",
      variant: "warning"
    });
    availableServices = [];
  }
}
