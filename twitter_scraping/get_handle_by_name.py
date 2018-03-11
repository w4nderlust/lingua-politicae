import pprint
import json
import tweepy
import sys
import csv
import types

results = []

with open('api_keys.json') as f:
	keys = json.load(f)

auth = tweepy.OAuthHandler(keys['consumer_key'], keys['consumer_secret'])
auth.set_access_token(keys['access_token'], keys['access_token_secret'])
api = tweepy.API(auth)
ids = ["Luigi Marino","Pier Ferdinando Casini","Vito Claudio Crimi","Pietro Aiello","Maria Elisabetta Alberti Casellati","Bruno Alicata","Silvana Amati","Francesco Maria Amoruso","Ignazio Angioni","Fabiola Anitori","Andrea Augello","Domenico Auricchio","Antonio Azzollini","Giovanni Barozzino","Raffaela Bellot","Johann Karl Berger","Silvio Berlusconi","Stefano Bertacco","Giovanni Emanuele Bilardi","Rosetta Enza Blundo","Bernab Bocca","Paolo Bonaiuti","Anna Cinzia Bonfrisco","Daniele Gaetano Borioli","Francesco Bruni","Donato Bruno","Elisa Bulgarelli","Roberto Calderoli","Giacomo Caliendo","Francesco Campanella","Rosaria Capacchione","Antonio Stefano Caridi","Franco Carraro","Roberto Cassinelli","Felice Casson","Gianluca Castaldi","Elena Cattaneo","Alfonso Ciampolillo","Monica Cirinna","Francesco Colucci","Silvana Comaroli","Luigi Compagna","Giuseppe Compagnone","Nunziante Consiglio","Franco Conte","Riccardo Conti","Paolo Corsini","Roberto Cotti","Jonny Crosio","Vincenzo Cuomo","Luigi D Ambrosio Lettieri","Vincenzo Mario Domenico D Ascola","Mario Dalla Tor","Gianpiero Dalla Zuanna","Emilia Grazia De Biasi","Cristina De Pietro","Salvatore Tito Di Maggio","Nerina Dirindin","Sergio Divina","Giuseppe Esposito","Lucia Esposito","Ciro Falanga","Vincenzo Fasano","Nicoletta Favero","Claudio Fazzone","Elena Ferrara","Mario Francesco Ferrara","Marco Filippi","Rosanna Filippin","Emilio Floris","Roberto Formigoni","Luigi Gaetti","Paolo Galimberti","Adele Gambaro","Massimo Garavaglia","Maria Grazia Gatti","Antonio Gentile","Niccolo Ghedini","Rita Ghedini","Mario Michele Giarrusso","Nadia Ginetti","Francesco Maria Giro","Manuela Granaiola","Tommaso Grassi","Maria Cecilia Guerra","Paolo Guerrieri Paleotti","Pietro Ichino","Josefa Idem","Pietro Iurlaro","Bachisio Silvio Lai","Albert Laniece","Linda Lanzillotta","Stefano Lepri","Pietro Liuzzi","Doris Lo Moro","Eva Longo","Fausto Guilherme Longo","Carlo Lucherini","Giuseppe Lumia","Luigi Manconi","Giovanna Mangili","Andrea Marcucci","Salvatore Margiotta","Marco Marin","Giuseppe Francesco Maria Marinello","Ignazio Roberto Maria Marino","Claudio Martini","Marino Germano Mastrangeli","Donatella Mattesini","Giuseppina Maturani","Giovanni Mauro","Riccardo Mazzoni","Maria Paola Merloni","Alfredo Messina","Claudio Micheloni","Maurizio Migliavacca","Antonio Milo","Marco Minniti","Augusto Minzolini","Franco Mirabelli","Francesco Molinari","Mario Morgoni","Emanuela Munerato","Paola Nugnes","Luis Alberto Orellana","Venera Padua","Giuseppe Pagano","Sara Paglini","Lionello Marco Pagnoncelli","Francesco Palermo","Nitto Francesco Palma","Carlo Pegorer","Paola Pelino","Luigi Perrone","Alessia Petraglia","Vito Petrocelli","Stefania Pezzopane","Renzo Piano","Enrico Piccinelli","Giovanni Piccoli","Leana Pignedoli","Roberta Pinotti","Luciano Pizzetti","Sergio Puglia","Francesca Puglisi","Laura Puppato","Gaetano Quagliariello","Raffaele Ranucci","Antonio Razzi","Manuela Repetti","Lucrezia Ricchiuti","Maria Rizzotti","Maurizio Romani","Paolo Romani","Lucio Romano","Gianluca Rossi","Luciano Rossi","Mariarosaria Rossi","Maurizio Giuseppe Rossi","Carlo Rubbia","Francesco Russo","Roberto Ruta","Giuseppe Ruvolo","Vincenzo Santangelo","Giorgio Santini","Antonio Fabio Maria Scavone","Renato Giuseppe Schifani","Salvatore Sciascia","Francesco Scoma","Giancarlo Serafini","Manuela Serra","Cosimo Sibilia","Annalisa Silvestro","Ivana Simeoni","Pasquale Sollo","Lodovico Sonego","Ugo Sposetti","Erika Stefani","Dario Stefano","Gianluca Susta","Lucio Rosario Tarquinio","Giorgio Tonini","Paolo Tosato","Mario Tronti","Renato Guerino Turano","Giuseppe Vacciano","Daniela Valentini","Denis Verdini","Antonio Giuseppe Maria Verro","Guido Walter Cesare Viceconte","Riccardo Villari","Luigi Zanda","Pierantonio Zanettin","Magda Angela Zanoni","Sergio Zavoli","Karl Zeller","Claudio Zin","Vittorio Zizza","Sante Zuffada","Nunzia Catalfo","Gian Marco Centinaio","Remigio Ceroni","Massimo Cervellini","Federica Chiavaroli","Vannino Chiti","Andrea Cioffi","Roberto Cociancich","Stefano Collina","Giuseppe Luigi Cucca","Erica D Adda","Antonio D Ali","Paola De Pin","Elena Fissore","Federico Fornaro","Vittorio Fravezzi","Serenella Fucksia","Francesco Giacobbe","Stefania Giannini","Vincenzo Gibiino","Carlo Giovanardi","Gianni Girotto","Miguel Gotor","Pietro Grasso","Marcello Gualdani","Pietro Langella","Nicola Latorre","Lucio Malan","Michela Montevecchi","Claudio Moscardelli","Massimo Mucchetti","Giorgio Napolitano","Riccardo Nencini","Andrea Olivero","Pamela Orru","Giorgio Pagliari","Franco Panizza","Annamaria Parente","Bartolomeo Pepe","Sergio Lo Giudice","Stefano Lucidi","Patrizia Manassero","Bruno Mancuso","Andrea Mandelli","Mario Mantovani","Alessandro Maran","Mauro Maria Marino","Bruno Marton","Altero Matteoli","Mario Mauro","Vilma Moronese","Maria Mussini","Alessandra Mussolini","Paolo Naccarato","Maurizio Sacconi","Angelica Saggese","Gian Carlo Sangalli","Francesco Scalia","Marco Scibona","Domenico Scilipoti","Maria Spilabotte","Giacomo Stucchi","Walter Tocci","Salvatore Tomaselli","Salvo Torrisi","Giulio Tremonti","Luciano Uras","Stefano Vaccari","Mara Valdinosi","Vito Vattuone","Francesco Verducci","Simona Vicari","Raffaele Volpi","Vincenzo D Anna","Angela D Onghia","Michelino Davico","Peppe De Cristofaro","Isabella De Monte","Loredana De Petris","Antonio De Poli","Domenico De Siano","Mauro Del Barba","Benedetto Della Vedova","Aldo Di Biagio","Ulisse Di Giacomo","Rosa Maria Di Giorgi","Daniela Donno","Giovanni Endrizzi","Stefano Esposito","Camilla Fabbri","Laura Fasiolo","Emma Fattorini","Valeria Fedeli","Corradino Mineo","Donatella Albano","Paolo Arrigoni","Patrizia Bisinella","Massimo Bitonci","Michele Boccardi","Fabrizio Bocchino","Sandro Bondi","Laura Bottici","Claudio Broglia","Filippo Bubbico","Maurizio Buccarella","Enrico Buemi","Massimo Caleo","Stefano Candiani","Laura Cantini","Enrico Cappelletti","Franco Cardiello","Valeria Cardinali","Monica Casaletto","Massimo Cassano","Barbara Lezzi","Carlo Martelli","Anna Finocchiaro","Maurizio Gasparri","Nicola Morra","Paola Taverna","Mario Monti","Elena Fattori","Alberto Airola","Gabriele Albertini","Bartolomeo Amidei","Francesco Aracri","Bruno Astorre","Lucio Barani","Lorenzo Battista","Alessandra Bencini","Anna Maria Bernini","Ornella Bertorotta","Maria Teresa Bertuzzi","Amedeo Bianco","Laura Bianconi","Laura Bignami"]

filename = 'result.csv'

def save(a):
	if(len(a)>0):
		x = a[0]

		# print(x)
		print((x.screen_name, str(x.description).strip(), x.profile_image_url, x.friends_count, x.statuses_count, x.location, x.verified) )
		results.append(a[0])
	else:
		print("n/a|n/a")
		a = types.SimpleNamespace()
		a.screen_name = "n/a"
		a.description = "n/a"
		a.profile_image_url = "n/a"
		a.friends_count = "n/a"
		a.statuses_count = "n/a"
		a.location = "n/a"
		a.verified = "n/a"
		results.append(a)

def end():
	print('saving...')
	f = open(filename, 'wt')

	try:
		writer = csv.writer(f,delimiter ='|')
		for x in results:
			writer.writerow( (x.screen_name, str(x.description).strip(), x.profile_image_url, x.friends_count, x.statuses_count, x.location, x.verified) )
		
	finally:
		f.close()
		print('all saved in '+ filename)
		exit()

	

def go(i):
	if(i > len(ids)-1):
		end()
	else:
		save(api.search_users(ids[i]))
		go(i + 1)

i = 0
print('starting retrieving accounts')
go(i)
