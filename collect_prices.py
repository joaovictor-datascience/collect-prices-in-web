#%%

from selenium.webdriver import Firefox
from selenium.webdriver.common.by import By

browser = Firefox()

elements_siggy = 'https://www.amazon.com.br/Cadeira-Ergon%C3%B4mica-Elements-Siggy-Cinza/dp/B0DJRWP6CZ/ref=sr_1_13?dib=eyJ2IjoiMSJ9.p-R6h6rz1jF52qgNJ8Fve9p0sggLt7k0FK-rw2PxRTBNjVCk28HX2ZSWVWzLdnBO1sHFO_0onrdzdEww79qaLCI8i5kSDkWNDjPxVuc0VF-WkA5h1EA1oI4Eh0MmkvzfOb0bFLCS-eTV-gHmLM9FF7fiyKU2IF6X_kE18H-WZ9PRT2zbagag8NG3Bm-4sl2dkap2B6DFTeiYk_mkgTxrLMZJxcaxAXk11dZTt4jIVCjWOrYjF_i4m4YJYZCerZ9tj7NSiIkpZpl_1X8A_ulYTHWN4ojlZqMLmz3VHOj6BA4.RGtKISu80loWjp8bac7a_Th9zvSFeTNAX12ftEfc_OY&dib_tag=se&keywords=cadeira+elements+sophy&qid=1763420059&sr=8-13&ufe=app_do%3Aamzn1.fos.95de73c3-5dda-43a7-bd1f-63af03b14751'

def find_product_amazon(link):

    browser.get(link)

    # Name
    product_name = browser.find_element(By.ID, 'productTitle').text

    # Price
    price_element = browser.find_element(By.CLASS_NAME, 'a-price-whole').text
    price_fraction = browser.find_element(By.CLASS_NAME, 'a-price-fraction').text
    
    price_product = price_element + "." + price_fraction

    return product_name, price_product

def find_product(product_link):
    
    if product_link in ('www.amazon.com.br'):
        find_product_amazon(product_link)

find_product(elements_siggy)



#%%
dict_test = {'store', 'name', 'price', 'link'}


