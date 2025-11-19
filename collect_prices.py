#%%

import datetime

import pandas as pd
from selenium.webdriver import Firefox
from selenium.webdriver.common.by import By

elements_siggy = 'https://www.amazon.com.br/Cadeira-Ergon%C3%B4mica-Elements-Siggy-Cinza/dp/B0DJRWP6CZ/ref=sr_1_13?dib=eyJ2IjoiMSJ9.p-R6h6rz1jF52qgNJ8Fve9p0sggLt7k0FK-rw2PxRTBNjVCk28HX2ZSWVWzLdnBO1sHFO_0onrdzdEww79qaLCI8i5kSDkWNDjPxVuc0VF-WkA5h1EA1oI4Eh0MmkvzfOb0bFLCS-eTV-gHmLM9FF7fiyKU2IF6X_kE18H-WZ9PRT2zbagag8NG3Bm-4sl2dkap2B6DFTeiYk_mkgTxrLMZJxcaxAXk11dZTt4jIVCjWOrYjF_i4m4YJYZCerZ9tj7NSiIkpZpl_1X8A_ulYTHWN4ojlZqMLmz3VHOj6BA4.RGtKISu80loWjp8bac7a_Th9zvSFeTNAX12ftEfc_OY&dib_tag=se&keywords=cadeira+elements+sophy&qid=1763420059&sr=8-13&ufe=app_do%3Aamzn1.fos.95de73c3-5dda-43a7-bd1f-63af03b14751'


def find_product_amazon(browser, link):

    browser.get(link)

    # Name
    product_name = browser.find_element(By.ID, 'productTitle').text

    # Price
    price_element = browser.find_element(By.CLASS_NAME, 'a-price-whole').text
    price_fraction = browser.find_element(By.CLASS_NAME, 'a-price-fraction').text
    
    price_product = price_element + "." + price_fraction

    now = datetime.datetime.now().strftime("%Y-%m-%d_%H:%M:%S.%f")

    browser.quit()

    return {'date_updated': now, 'store':'Amazon', 'name':product_name, 'price':price_product, 'link':link}


def check_store(link):

    browser = Firefox()

    match link:
        case link if 'www.amazon.com.br' in link:
                info_product = find_product_amazon(browser, link)
                return info_product
        case link if 'www.kabum.com.br' in link:
                info_product = find_product_amazon(browser, link)
                return info_product
        case link if 'www.elements.com.br' in link:
                info_product = find_product_amazon(browser, link)
                return info_product
        case link if 'www.mercadolivre.com.br' in link:
                info_product = find_product_amazon(browser, link)
                return info_product
        case _:
                return print('store not localizated')
          
def find_product(product_link):

    product = check_store(product_link)

    return product

