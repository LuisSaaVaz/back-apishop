# COMPRAVENTA TECNOLOGÍA RETRO

## Uso y Características de la API

Los requisitos que se piden para la creación de la API se encuentran en el archivo ***Requisitos.md***

#### Iniciar la APP

------------
1. Instalar los node_modules con el comando **"npm install"**.
2. Crear el archivo ***.env*** y rellenar los datos basándonos en el archivo ***.env.example***. IMPORTANTE! Los datos de mailgun deben ser importados tal cual estan en el archivo ***.env.example***.
3. Para iniciar la aplicacion previamente se debe ejecutar un script a elegir entre ***npm run dbFull*** o ***npm run dbEmpy*** y una vez finalizado el proceso ejecutaremos el scrip ***npm run dev*** que inicia el Servidor.

#### Uso de las DDBB

------------

- La función *"dbEmpy"* crea la DDBB con las distintas tablas necesarias para su uso, esta función sería la que queda para cuando se lance a producción ya que no introduce ningún dato en las tablas.

- La función *"dbFull"* crea la DDBB con las distintas tablas necesarias para su uso, así como una serie de usuarios y productos para que se puedan hacer búsquedas más complejas entre otras funciones. Para vuestra comodidad dejamos activos los siguientes emails que ya están registrados en mailgun.

> "habfakebraian@yopmail.com" y "habfakeluis@yopmail.com" para probar los endpoints de creación y activación de los usuarios así como el resto de endpoints. y otros 3 "habfakeuser-example@yopmail.com" que ya están activados en la base de datos en los que se cargan los diferentes productos. IMPORTANTE! Sustituir la palabra example por un número entre 1-3.

- Debido a las limitaciones que nos impone MailGun, solo podemos crear un total de 5 cuentas funcionales por lo que eso afecta a la riqueza de la aplicación en cuanto a interacción con otros usuarios ya que si introducimos mas usuarios no se podrian comprar y valorar sus productos por la incapacidad de que le lleguen emails.

### Uso de la API
------------
#### Postman
En los archivos de la API se encuentra el archivo ***API_SHOP.postman_collection.json*** el cual deberemos importar en nuestro postman personal para probar los diferentes endpoints. Se recomienda configurar las variables de entorno para una mejor experiencia de usuario.

#### ENDPOINTS

A continuación se detallan los diferentes endpoints, tanto su funcionamiento como las diferentes validaciones.
#### Accounts

- **Create Account**: URL del postman => **/api/accounts**.

Este endpoint se encarga de la creacion del usuario, para ello devemos enviar por el body con el formato **raw** un objeto tipo **JSON** con los siguientes parametros.

- **name**: "David"
- **email**: " habfakebraian@yopmail.com"
- **password**: "mypassword"

Si el usuario se crea con éxito se enviará un email de activación al correo especificado.

Para la activación de la cuenta debemos copiar el link que se nos envía y pegarlo en alguna ruta del postman o directamente en el navegador.

**VALIDACIONES**

1. - Validamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por el body, comprobamos que se hayan especificado los tres campos y que los datos sean correctos.
3. - Comprobamos que el usuario no exista en la bbdd.
4. - Comprobamos que el email se envíe con éxito.

------------
- **Deleted Account** : 

 - **Delete My Account** URL del postman => **/api/accounts/delete**.
   
   En este endpoint un usuario logeado puede borrar su cuenta.
   
   Para solicitar el borrado de su account debemos introducir la siguiente URL:

 	> Ejemplo: http://localhost:9000/api/accounts/delete
 
	-***Consecuencias*** :
 		-Al hacerlo elimina todo su rastro de la base de datos, por efecto cascada desaparecen los likes, bookings, products, user y los directorios de las fotos de sus productos y de su avatar.
		-Actualizamos en la columna **loves**, el numero de likes dados por los usuarios; al borrar una account desaparecen todas las referencias de las tablas likes, bookings y products. Como consecuencia el usuario tiene menos productos en su lista de likes.

 - **Delete Account By Id** URL del postman => **/api/accounts/delete/byId/:id**

   En este endpoint un usuario logeado y que sea **Admin** puede borrar 1 o mas cuentas concatenando el id de cada una '1-2-3-4'.
   
   Para solicitar el borrado de 1 o mas accounts debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/accounts/delete/byId/1
 o
 Ejemplo: http://localhost:9000/api/accounts/delete/byId/1-2-3-4

	-***Consecuencias*** :
		Este borrado tiene las mismas consecuencias que en **Delete My Account**

 - **Delete Account By Admin** URL del postman => **/api/accounts/delete/byAdmin**
   En este endpoint un usuario logeado y que sea **Admin** puede borrar todas las cuentas de usuarios que no sean **Admin**.
   
	Para solicitar el borrado de su account debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/accounts/delete/byAdmin
 
	-***Consecuencias*** :
		Este borrado tiene las mismas consecuencias que en **Delete My Account**

**VALIDACIONES**

1. - Validamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por params, comprobamos que los datos sean correctos con una funcion de Validacion.
3. - Comprobamos que el usuario esta borrando su propia cuenta o si es **Admin**.
4. - Preparamos las rutas de las fotos de productos y avatar.
5. - Procedemos al borrado
6. - Actualizamos en la columna **loves**.
------------

#### Auth

- **Authorization**: URL del postman => **/api/auth**.

En este endpoint comprobamos y permitimos que un usuario se logue en la APP. Para ello debemos insertar por el body con el formato **raw** un objeto tipo **JSON** con los siguientes parámetros.

- **email**:"habfakerBraian@yopmail.com"
- **password**: "mypassword"

Si el usuario se loguea con este, se le devolverá por la respuesta un objeto con un token de acceso, el cual le permitirá permanecer conectado por un determinado periodo de tiempo.

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por el body. Comprobamos que se hayan especificado los 2 campos y que los datos sean correctos.
3. - Comprobamos que el usuario tenga la cuenta activada para logearse.
4. - Validamos la contraseña con el bcrypt.

------------

#### Products

- **Create Product**: URL del postman => **/api/products**.

En este endpoint nos encargamos de publicar un producto para ponerlo a la venta. El usuario debe está logueado por lo que tenemos que utilizar el endpoint de **Auth** para generar un token y meterlo en los headers de esta ruta, ya sea de manera manual o a través de las variables de entorno.

Para publicar un producto debemos introducir por el body con el formato **form-data** los siguientes parámetros.

- **image**: "iphone.jpeg" (required). *Formatos validos de imagen.
- **name** : " Pc gaming MSI". (required).
- **category:**  " desktop" (required) *Categorías Válidas.
- **price**:  "400" (required).
- **location**: "Coruña " (required).
- **caption**: "Ordenador portatil MSI ".

> **Categorías Válidas:** 'desktop', 'notebook' ,' tablet', 'smatphone', 'ebook', smartwatch', 'console'' 'tv', 'camera', 'mouse', 'keyboard', 'headset', 'speaker', 'printer', 'scanner', 'charger',

> **Formatos válidos de imagen**: 'jpeg', 'png'.

Si el usuario consigue introducir de manera correcta los datos y el token, un nuevo producto se pondrá a la venta con éxito y se enviará como respuesta un mensaje con el ID del producto que se acaba de publicar.

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Comprobamos que el usuario este logueado.
3. - Validamos los datos que nos llegan por el body. Comprobamos que se hayan especificado todos los datos requeridos, y que los datos introducidos sean correctos y estén dentro de las categorías y formatos válidos.
4. - Comprobamos que no se exceda el límite de publicaciones por usuarios.

------------
- **Buy Product**: URL del postman => **/api/products/"ID del producto a comprar"/buy**.

En este endpoint solicitamos la compra de un producto por parte de un usuario. Para ello debe estar registrado y en este caso introducir la ID del producto que desea comprar.

Para solicitar la compra de un producto debemos introducir por la query el ID del producto.

 > Ejemplo: http://localhost:9000/api/products/24/buy.

Si el usuario consigue realizar la solicitud de compra correctamente, se enviará un correo electrónico al vendedor del producto con un enlace para confirmar la compra.

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Comprobamos que el usuario este logueado.
3. - Validamos el ID que nos llega por los params.
4. - Comprobamos que la persona que solicita la compra del producto, no sea la misma que lo publicó.
5. - Comprobamos que el producto no haya sido vendido.

------------
- **Confirm purcharse**: URL del postman =>**/api/products/13/confirm**

En este endpoint confirmamos la venta de un producto. A esta URL solo se puede acceder a traves del enlace que nos llega al correo del vendedor, para usarlo debemos copiar y pegar en el endpoint del postman con el nombre *"Confirm purcharse"*

> 	Ejemplo: http://localhost:9000/api/products/13/confirm?email="token"

Para indicar la fecha y lugar de entrega debemos enviar por el body con el formato **raw** un objeto tipo **JSON** con los siguientes parametros.

- **deliveryTime**: "2022-09-01 12:34",
- **deliveryAddress**: "Capitan Juan Varela"

Si el vendedor acepta la compra se le enviará un correo al comprador con los detalles de la venta y un link para votar el vendedor una vez se haya entregado el producto.

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Comprobamos que el usuario este logueado.
3. - Validamos los datos que nos llegan por el body y por la URL.
4. - Comprobamos que la persona que realioza la venta del producto,  sea la misma que lo publicó.
5. - Comprobamos que el producto este disponible para comprar.
------------


- **Get Products**:
 - **Get All Products** URL del postman => **/api/products**.
 
   En este endpoint **cualquier** usuario puede ver todos los productos de la tienda
   
   	Para obtener todos los **productos** debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products
 
 - **Get Product By Id** URL del postman => **/api/products/filterBy/id/:id**.
 
   En este endpoint **cualquier** usuario puede ver 1 o mas productos concatenando el id de cada una '1-2-3-4'.
   
   	Para obtener todos los **productos** debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/filterBy/id/1
	o
	Ejemplo: http://localhost:9000/api/products/filterBy/id/1-2-3-4
 
 - **Get Product By Category** URL del postman => **/api/products/filterBy/category/:category**
 
   En este endpoint **cualquier** usuario puede ver todos los productos de la tienda filtrandolos por **category** y ademas añadir mas filtros
   
   	Para obtener todos los **productos** debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/filterBy/category/tv
	o
	Ejemplo: http://localhost:9000/api/products/filterBy/category/tv?minPrice=300
 
 - **Get Product By User Id** URL del postman => **/api/products/filterBy/userId/:userId**
 
   En este endpoint **cualquier** usuario puede ver todos los productos de la tienda filtrandolos por **userId** y ademas añadir mas filtros
   
   	Para obtener todos los **productos** debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/filterBy/userId/4
	o
	Ejemplo: http://localhost:9000/api/products/filterBy/userId/4?categoy=tablet
 
 - **Get Product By Bought** URL del postman => **/api/products/filterBy/bought**
 
   En este endpoint **cualquier** usuario puede ver todos los productos de la tienda filtrandolos por **userId** y ademas añadir mas filtros
   
   	Para obtener todos los **productos** debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/filterBy/bought

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por params y queryStrings. Comprobamos que los datos sean correctos con una funcion de Validacion.
3. - Procedemos a realizar la peticion

------------
- **Delete Products**:

 - **Delete Product By Id** URL del postman => **/api/products/delete/byId/:id**.
   
    En este endpoint un usuario logeado o que sea **Admin** puede borrar 1 o mas productos concatenando el id de cada una '1-2-3-4'.
   
   Para solicitar el borrado de 1 o mas productos debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/delete/byId/1
 o
 Ejemplo: http://localhost:9000/api/products/delete/byId/1-2-3-4
 
	-***Consecuencias*** :
 		-Al hacerlo elimina todo del producto de la base de datos, por efecto cascada desaparecen los likes, bookings, products y los directorios de las fotos de sus productos.
		-Actualizamos en la columna "loves" de "users", el numero de likes dados por los usuarios; al borrar una account desaparecen todas las referencias de las tablas likes, bookings y products. Como consecuencia el usuario tiene menos productos en su lista de likes.
		-Actualizamos en la columna "likes" de "users", el numero de likes recibidos por el dueño del producto; al borrar el producto desaparecen todas las referencias de las tablas likes, bookings y products. Como consecuencia el usuario tiene menos likes en sus productos.

 - **Delete Products By User Id** URL del postman => **/api/products/delete/byUserId/:id**
   En este endpoint un usuario logeado o que sea **Admin** puede borrar todos sus productos o los de un usuario que no sea **Admin**.
   
	Para solicitar el borrado de los productos de 1 usuario debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/delete/byUserId/1
 
	-***Consecuencias*** :
		Este borrado tiene las mismas consecuencias que en **Delete Product By Id**

 - **Delete Account By Admin** URL del postman => **/api/products/delete/byAdmin**
   En este endpoint un usuario logeado y que sea **Admin** puede borrar todos los productos de usuarios que no sean **Admin**.
   
	Para solicitar el borrado de los productos debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/delete/byAdmin
 
	-***Consecuencias*** :
		Este borrado tiene las mismas consecuencias que en **Delete Product By Id**

**VALIDACIONES**

1. - Validamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por params, comprobamos que los datos sean correctos con una funcion de Validacion.
3. - Comprobamos que existen productos.
4. - Comprobamos que el usuario esta borrando sus productos.
5. - Comprobamos que el usuario es **Admin**.
6. - Comprobamos si los productos son de un usuario **Admin**.
7. - Preparamos las rutas de las fotos de productos.
8. - Procedemos al borrado.
9. - Actualizamos la columna **loves** de **users**.
10. - Actualizamos la columna **likes** de **users**.
------------


- **Update Products**:

 - **Update Product Info** URL del postman => **/api/products/update/info/:id**.
   
    En este endpoint un usuario logeado o que sea **Admin** puede actualizar la **info** (name, category, location, price, caption ) de 1 producto.
   
   Para solicitar la actualizacion de la info 1 producto debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/update/info/1
 
	-***Consecuencias*** :
 		-Al hacerlo se modifica la "info" del producto de la base de datos.

  - **Update Product Image** URL del postman => **/api/products/update/image/:id**.
  
   En este endpoint un usuario logeado o que sea **Admin** puede actualizar la **image** de 1 producto.
   
   Para solicitar la actualizacion del image de 1 producto debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/products/update/image/1
 
	-***Consecuencias*** :
		Este update tiene las mismas consecuencias que en **Update Product Info**

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Comprobamos que el usuario este logueado.
3. - Validamos los datos que nos llegan por **params** y el **body**. Comprobamos que se hayan especificado todos los datos requeridos, y que los datos introducidos sean correctos y estén dentro de las categorías y formatos válidos.
4. - Procedemos a la actualización.

------------

#### Users

- **Vote users**: URL del postman => **/api/users/score/:id**.

Este endpoint se encarga de gestionar la valoracion de los vendedores. Para ello debemos recuperar el link que nos envio el vendedor al correo con los datos de la venta del producto y pegarlo en la ruta del postman *"Vote users".*

>  Ejemplo: http://localhost:9000/api/users/score/2?vote=3

Si el producto ha sido entregado el comprador podrá valorar el producto a traves del link mencionado anteriormente.

**VALIDACIONES**

1. - Validamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por la query sean correctos
3. - Comprobar que el producto ha sido comprado y que el status sea "bought" en la DDBB. 
4. - Comprobamos que el usuario solo pueda valorar productos que no le pertenezcan y solo pueda valorar una vez por producto.
5. - Comprobar que el producto ha sido entregado mirando la hora de entrega y la hora actual. 

------------

- **Update Users**:

 - **Update User Info** URL del postman => **/api/users/update/info**.
   
	En este endpoint un usuario **logeado**  puede actualizar su **info** (name, bio, status).

	Los datos llegan por el **body** con el formato **raw** y un objeto tipo **JSON** con los siguientes parametros.

- **"name"**: "David"
- **"bio"**: "Me llamo David, tengo 25 años y me gustan la consolas retro"
- **"status"**: "admin"
   
   Para solicitar la actualizacion de la info debemos introducir la siguiente URL:
   
	> Ejemplo: http://localhost:9000/api/users/update/info
 
	-***Consecuencias*** :
 		-Al hacerlo se modifica la "info" de ese usuario en la base de datos.

  - **Update User Avatar** URL del postman => **/api/products/update/image/:id**.
  
   En este endpoint un usuario **logeado**  puede actualizar su **avatar**.
   
   	Los datos llegan por el **body** con el formato **form data** y tipo **file**.

- **key**: "avatar"
- **value**: foto.jpg

   Para solicitar la actualizacion del avatar debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/users/update/avatar
 
	-***Consecuencias*** :
		Este update tiene las mismas consecuencias que en **Update User Info**

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Comprobamos que el usuario este logueado.
3. - Validamos los datos que nos llegan por el **body**. Comprobamos que se hayan especificado todos los datos requeridos, y que los datos introducidos sean correctos y estén dentro de las categorías y formatos válidos.
4. - Procedemos a la actualización.

------------

#### Likes

- **Post like**: URL del postman => **/api/likes/:id**.

En este endpoint un usuario **logeado**  puede publicar un **like** de un producto.

Para publicar un like recibimos por **params** el **id** del producto.

>  Ejemplo: http://localhost:9000/api/likes/3

**VALIDACIONES**

1. - Validamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por params sean correctos
3. - Comprobamos si el producto existe.
4. - Comprobamos que el producto no le pertenezca al usuario logueado.
5. - Comprobamos que el producto no tiene like del usuario logueado.
6. - Procedemos a realizar la peticion.
7. - Actualizar el numero de likes del producto en la DDBB
8. - Actualizar el numero de likes que dio el usuario logueado en su columna loves
9. - Actualizar el numero de likes que recibio el usuario propietario del producto en su columna likes
------------
- **Get Likes**:
 - **Get All Likes** URL del postman => **/api/likes**.
 Para obtener todos los **likes** debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/likes
 
 - **Get Likes By Product Id** URL del postman => **/api/likes/filterBy/productId/:product_id**.
 
   En este endpoint **cualquier** usuario puede ver **todos** los **likes** que tiene un producto.
   
   Recibimos por **params** el **id** del producto.
   
   Para obtener todos los **likes** de un **producto** debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/likes/filterBy/productId/1
 
 - **Get Product By User Id** URL del postman => **/api/likes/filterBy/userId/:user_id**
 
   En este endpoint **cualquier** usuario puede ver **todos** los **likes** que tienen los productos de un usuario.
   
   Recibimos por **params** el **id** del usuario dueño de los productos.
   
   Para obtener todos los **likes** de los productos de un usuario debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/likes/filterBy/userId/4
 
 - **Get Product By Lover Id** URL del postman => **/api/likes/filterBy/loverId/:lover_id**
 
   En este endpoint **cualquier** usuario puede ver **todos** los **likes** que dio un usuario.
   
   Recibimos por **params** el **id** del usuario que dio los likes.
   
   Para obtener todos los **likes** dados por un usuario debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/likes/filterBy/loverId/4

**VALIDACIONES**

1. - Comprobamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por params. Comprobamos que los datos sean correctos con una funcion de Validacion.
3. - Procedemos a realizar la peticion

------------
- **Delete Likes**:

 - **Delete Likes By Id** URL del postman => **/api/likes/delete/byId/:id**.
   
    En este endpoint un usuario logeado puede borrar 1 **like** de un **producto** que haya dado él.
   
   Para solicitar el borrado del like debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/likes/delete/byId/1
 
	-***Consecuencias*** :
 		-Al hacerlo elimina todo el like de la base de datos, esto afecto al total de likes del producto, al total de likes del dueño del producto y al total de loves del usuario logueado.
		-Actualizamos en la columna "likes" de "products", el numero de likes del producto. El producto tiene menos likes.
		-Actualizamos en la columna "loves" de "users", el numero de likes dados por el usuario logueado. Como consecuencia el usuario logueado tiene menos productos en su lista de likes.
		-Actualizamos en la columna "likes" de "users", el numero de likes recibidos por el usuario dueño del productos. Como consecuencia el usuario dueño del producto tiene menos likes en sus productos.

 - **Delete Likes By Product Id** URL del postman => **/api/likes/delete/byProductId/:product_id**
   En este endpoint un usuario logeado o que sea **Admin** puede borrar todos los likes los de un usuario que no sea **Admin**.
   
	Para solicitar el borrado de los productos de 1 usuario debemos introducir la siguiente URL:

	> Ejemplo: http://localhost:9000/api/likes/delete/byProductId/1
 
	-***Consecuencias*** :
		Este borrado tiene las mismas consecuencias que en **Delete Product By Id**

**VALIDACIONES**

1. - Validamos que la URL sea la correcta.
2. - Validamos los datos que nos llegan por params, comprobamos que los datos sean correctos con una funcion de Validacion.
3. - Comprobamos que existe el producto.
4. - Comprobamos que el producto tiene likes.
5. - Comprobamos que el usuario esta borrando sus likes.
6. - Procedemos al borrado del like.
7. - Actualizamos la columna **likes** de **products**
8. - Actualizamos la columna **loves** de **users**.
9. - Actualizamos la columna **likes** de **users**.
