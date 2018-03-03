
const PARTIES = ["M5S", "piùEuropa", "Lega Nord", "Forza Italia", "Potere Al Popolo",  "Fratelli d'Italia", "PD",  "Liberi e Uguali", "Casa Pound"];
const PARTYCOLORS  = ["#FCDA1B", "#2D9DB4", "#299733", "#13487B", "#DE0016", "#151653", "#EB733F", "#DE0000", "black"];

let width = window.document.body.clientWidth * .7;
let height = window.document.body.clientHeight;

let svg = d3.select("body").append("svg").attr("height", height).attr("width", width);

let edgesCont = svg.append("g").attr("id", "edgesCont");
let nodesCont = svg.append("g").attr("id", "nodesCont");

// TOOLTIP
let tooltip =d3.select("body").append("div").attr("id", "tooltip");

// SCALES
let radiusScale = d3.scaleSqrt().clamp(true).range([10,40]);
let strokeScale = d3.scaleLinear().clamp(true).range([1,5]);
let distanceScale = d3.scaleLinear().clamp(true).range([width*.2,10]); // lighter weight correspond to higher distances
let colorScale = d3.scaleOrdinal().range(PARTYCOLORS).domain(PARTIES);

// DATA
let graph;
let selectedSource;
let selectedTarget;

// PHYSICS
let simulation;
let link;
let node;
let text;





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
	link = edgesCont.selectAll(".link")
	.data(edges, (d)=>d.id); 

	let linkGroups = link
	.enter()
	.append("g")
	.attr("class", "link")
	.style("opacity", .7)
	.on("mouseover", function(d){updateEdgeTooltip(d, d3.select(this));})
	.on("mouseout", function(){updateEdgeTooltip(null, d3.select(this));});

	linkGroups
	.append("line")
	.attr("stroke-width", 10) 
	.style("stroke-opacity", 0);


	linkGroups
	.append("line")
	.attr("class", "realLink")
	.attr("stroke-width", (d)=>strokeScale(d.weight));


	link
	.exit()
	.remove();

	node = nodesCont.selectAll(".node")
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


	text = svg
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
		.force("center", d3.forceCenter(width / 2, height / 2))
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




function updateEdgeTooltip(d, el) {

	if(!selectedSource) return;


	if(d && d.source.id == selectedSource.id) {

		selectedTarget = d.target;

		el
		.select(".realLink")
		.style("stroke", "black");


		tooltip
		.append("h3")
		.text(`${d.source.name} – ${d.target.name} `);

		tooltip
		.append("b")
		.text("Parole in comune più usate");

		tooltip
		.append("p")
		.text(d.words.most_similar.map(d=>d[0]).join(", "));

		tooltip
		.append("b")
		.text("Parole in comune meno usate");

		tooltip
		.append("p")
		.text(d.words.most_different.map(d=>d[0]).join(", "));

		


	} else {

		tooltip
		.html("");

		d3.selectAll(".realLink")
		.style("stroke", d=> d.source.id == selectedSource.id ? colorScale(d.source.partito) : "#ddd");

		selectedTarget = null;

	}
	
	updateNodeStrokes();
	
}

function updateNodeStrokes() {

	d3.selectAll("circle")
	.style("stroke-width", d=> {
		let isSelectedSource = selectedSource && d.id == selectedSource.id;
		let isSelectedTarget = selectedTarget && d.id == selectedTarget.id;
		return (isSelectedTarget || isSelectedSource)  ? 3 : 0;
	});

}


function updateSelectedNode(d) {

	d.selected = true;
	selectedSource = d;

	d3.selectAll(".link")
	.each(function(d){
		
		let el = d3.select(this);

		el.style("cursor",  edge=> edge.source.id == selectedSource.id ? "pointer" : "default");

		el
		.style("opacity", edge=> edge.source.id == selectedSource.id ? 1 : .7);

		el	
		.select(".realLink")
		.style("stroke", edge=> edge.source.id == selectedSource.id ? colorScale(edge.source.partito) : "#ddd");

		let node = el.node();
		if( d.source.id == selectedSource.id) {
			node.parentNode.appendChild(node);
		}
	});

	updateNodeStrokes();

}


// START
d3.json("politicians_graph.json", onLoaded);