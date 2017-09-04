	
const THRESHOLD = .2; 
const THRESHOLD_1 = .3; 
const THRESHOLD_2 = .5; 

// DATA
var graph;

// NODES
var svg = d3.select("svg");
var width = +svg.attr("width");
var height = +svg.attr("height");

// SCALES
var dashScale = d3.scaleQuantize().domain([THRESHOLD_1, THRESHOLD_2, 1]).range(["5,5","5,10","5,20"]);
var color = d3.scaleOrdinal(d3.schemeCategory20);
var radiusScale = d3.scaleLinear().range([10,50]);
var opacityScale = d3.scaleLinear().range([0,1]);

// PHYSICS
var simulation = d3.forceSimulation()
.force("link", d3.forceLink())
.force("charge", d3.forceManyBody())
.force("center", d3.forceCenter(width / 2, height / 2));


var link, node, text;


// FUNCTIONS
function onLoaded(error, data) {

	if (error) throw error;

	graph = data;

	radiusScale.domain(d3.extent(data.nodes, (d)=>d.tweets))
	opacityScale.domain(d3.extent(data.edges, (d)=>d.weight))

	var linkData = graph.edges.filter((d)=> d.weight> THRESHOLD)
	console.log(linkData)
	link = svg.append("g")
	.attr("class", "links")
	.selectAll("line")
	.data(linkData)
	.enter()
	.append("line")
	.style("stroke-opacity", (d)=> opacityScale(d.weight))
	// .attr("stroke-width", (d)=> (d.weight > THRESHOLD_1? 1:1.5))
	.attr("stroke-dasharray", (d)=> (d.weight > THRESHOLD_1 ? dashScale(d.weight) : 0 ))

	

	node = svg.append("g")
	.attr("class", "nodes")
	.selectAll("circle")
	.data(graph.nodes)
	.enter()
	.append("circle")
	.attr("r", (d)=> (radiusScale(d.tweets)))
	.attr("fill", "red")
	.style("fill-opacity", 1)
	.call(d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended));

	text = svg
	.selectAll("text")
	.data(graph.nodes)
	.enter()
	.append("text")
	.text((d)=> d.name);
	
	//  only start sim if have the right data
	if(linkData.length && graph.nodes.length) {

		simulation
		.nodes(graph.nodes)
		.on("tick", ticked);

		simulation.force("link")
		.links(linkData)
		.distance((d)=> (100 + radiusScale(d.source.tweets) + radiusScale(d.target.tweets)) )
		.strength(1);

	}

}

function ticked() {
	
	link
	.attr("x1", (d)=> d.source.x)
	.attr("y1", (d)=> d.source.y)
	.attr("x2", (d)=> d.target.x)
	.attr("y2", (d)=> d.target.y)

	node
	.attr("cx", (d)=> d.x)
	.attr("cy", (d)=> d.y)

	text
	.attr("x", (d)=>d.x)
	.attr("y", (d)=>d.y)

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



// START
d3.json("politicians_graph.json", onLoaded)


