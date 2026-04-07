from app.database import create_tables, get_products_to_scrape, save_result
from app.runner import run

# Garante que as tabelas existem
create_tables()

# Busca produtos ativos do banco de dados
products = get_products_to_scrape()

if not products:
    print("Nenhum produto ativo encontrado no banco de dados.")
    print("Use a API para cadastrar produtos e URLs.")
    exit(0)

print(f"Produtos encontrados: {len(products)}")

# Executa o scraping
results = run(products)

# Salva os resultados
for result in results:
    save_result(result)

print(f"\nTotal salvo: {len(results)} registros")