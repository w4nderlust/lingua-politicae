
const PARTIES = ["M5S", "piùEuropa", "Lega Nord", "Forza Italia", "Potere Al Popolo",  "Fratelli d'Italia", "PD",  "Liberi e Uguali", "Casa Pound"];
const PARTYCOLORS  = ["#FCDA1B", "#2D9DB4", "#299733", "#13487B", "#DE0016", "#151653", "#EB733F", "#DE0000", "black"];

let container = d3.select("#container");
let width = container.node().getBoundingClientRect().width;
let height = container.node().getBoundingClientRect().height;


let svg = container.select("svg").attr("height", height);
let edgesCont = svg.append("g").attr("id", "edgesCont");
let nodesCont = svg.append("g").attr("id", "nodesCont");

// TOOLTIP
let tooltip =d3.select("#tooltip");

// SCALES
let radiusScale = d3.scaleSqrt().clamp(true).range([10,40]);
let strokeScale = d3.scaleLinear().clamp(true).range([1,5]);
let distanceScale = d3.scaleLinear().clamp(true).range([width*.1,10]); // lighter weight correspond to higher distances
let colorScale = d3.scaleOrdinal().range(PARTYCOLORS).domain(PARTIES);

// DATA
let graph;
let selectedSource;

// PHYSICS
let simulation;





function onLoaded(error, data) {

	if (error) throw error;

	let partiti = {};
	data.nodes.forEach(d=>{if(!partiti[d.partito]) partiti[d.partito]= d;});

	graph = data;

	// assign id based on indices
	graph.nodes.forEach((d,i)=> d.id=i);

	// update scales
	let sortedWeights = graph.edges.map((d)=>d.weight).sort();
	let quantileExtent = [d3.quantile(sortedWeights, 0.05), d3.quantile(sortedWeights, 0.95)];

	distanceScale.domain(quantileExtent);
	strokeScale.domain(quantileExtent);
	radiusScale.domain(d3.extent(graph.nodes, (d)=>d.tweets));


	updateGraph();

}


function updateGraph() {

	let edges = graph.edges.filter(d=>d.weight > 0.1);

	let link = edgesCont.selectAll(".link")
	.data(edges, (d)=>d.id); 

	let linkGroups = link
	.enter()
	.append("g")
	.attr("class", "link")
	.style("opacity", .7)
	.on("mouseover", function(d){updateEdgeTooltip(d, d3.select(this));})
	.on("mouseout", function(){updateEdgeTooltip(null, null);});

	linkGroups
	.append("line")
	.attr("stroke-width", 10) 
	.style("stroke-opacity", 0);


	linkGroups
	.append("line")
	.attr("class", "realLink")
	.attr("stroke-width", (d)=>strokeScale(d.weight));

	let node = nodesCont.selectAll(".node")
	.data(graph.nodes, (d)=>d.name);

	node
	.enter()
	.append("circle")
	.attr("class", "node")
	.attr("r", (d)=> (radiusScale(d.tweets)))
	.style("stroke-width", 0)
	.style("stroke", "black")
	.style("fill", d=>colorScale(d.partito))
	.style("fill-opacity", 1)
	.on("mousedown", updateSelectedNode)
	.call(d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended));

	node
	.exit()
	.remove();


	let text = svg
	.selectAll(".label")
	.data(graph.nodes);

	text
	.enter()
	.append("g")
	.attr("class", "label")
	.each(function(d){

		var el = d3.select(this);

		el
		.append("text")
		.attr("text-anchor", "middle")
		.attr("fill", "black")
		.text(d.name);

	});



	text
	.exit()
	.remove();


	if(!simulation) {
		simulation = d3.forceSimulation()
		.force("link", d3.forceLink())
		.force("charge", d3.forceCollide().radius((d)=>radiusScale(d.tweets)*2))
		.force("center", d3.forceCenter(width * .4, height * .4))
		.on("tick", ticked);
	}
	simulation.nodes(graph.nodes);


	simulation.force("link")
	.links(graph.edges)
	.distance((d)=> {
		return distanceScale(d.weight) + 200;
	});
}




function ticked() {
	svg.selectAll(".link").selectAll("line")
	.attr("x1", (d)=> d.source.x)
	.attr("y1", (d)=> d.source.y)
	.attr("x2", (d)=> d.target.x)
	.attr("y2", (d)=> d.target.y);

	svg.selectAll(".node")
	.attr("cx", (d)=> d.x)
	.attr("cy", (d)=> d.y);

	svg.selectAll(".label")
	.attr("transform", d=>`translate(${d.x}, ${d.y + radiusScale(d.tweets) + 10})`);

}

function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
}

function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}




function updateEdgeTooltip(edge, el) {

	if(!selectedSource) return;


	if(edge && (edge.source.id == selectedSource.id || edge.target.id == selectedSource.id)) {

		el
		.select(".realLink")
		.style("stroke", "black");


		tooltip
		.append("h3")
		.text(`${edge.source.name} – ${edge.target.name} `);

		tooltip
		.append("b")
		.text("Parole in comune più usate");

		tooltip
		.append("p")
		.text(edge.words.most_similar.map(d=>d[0]).join(", "));

		tooltip
		.append("b")
		.text("Parole in comune meno usate");

		tooltip
		.append("p")
		.text(edge.words.most_different.map(d=>d[0]).join(", "));

		updateNodeStrokes(edge);


	} else {

		tooltip
		.html("");

		updateEdgeStrokes();
		updateNodeStrokes();


	}
	
	
}

function updateNodeStrokes(edge) {

	nodesCont
	.selectAll(".node")
	.style("stroke-width", d=> {
		
		let selected;

		if(edge) {
			selected = d.id == edge.source.id || d.id == edge.target.id;
		} else {
			selected = d.id == selectedSource.id;
		}

		return selected ? 3 : 0;
	});

}

function updateEdgeStrokes() {

	edgesCont
	.selectAll(".realLink")
	.style("stroke", d=>{
		let selected = d.source.id == selectedSource.id || d.target.id == selectedSource.id;
		return selected ? colorScale(selectedSource.partito) : "#ddd";
	});

}

function updateSelectedNode(d) {

	d.selected = true;
	selectedSource = d;

	edgesCont
	.selectAll(".link")
	.each(function(edge){
		
		let el = d3.select(this);

		let selected = edge.source.id == selectedSource.id || edge.target.id == selectedSource.id ;
		
		el.style("cursor", selected ? "pointer" : "default").style("opacity", selected ? 1 : .7);
		
		if( selected) {
			let node = el.node();
			node.parentNode.appendChild(node);
		}

	});

	updateEdgeStrokes(d);
	updateNodeStrokes();

}


// START
d3.json("politicians_graph.json", onLoaded);