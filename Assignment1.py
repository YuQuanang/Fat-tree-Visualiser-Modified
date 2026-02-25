import networkx as nx

def build_fat_tree(k=4, num_pods=None, link_capacity=10.0):
    if k % 2 != 0:
        raise ValueError("k must be even")
    num_pods = num_pods or k
    
    G = nx.Graph()
    pod_nodes = {i: set() for i in range(num_pods)}
    num_edge_per_pod = num_agg_per_pod = servers_per_edge = k // 2
    num_core = (k // 2) ** 2
    server_id = edge_id = agg_id = 1
    
    for pod in range(num_pods):
        pod_edge_switches = []
        pod_agg_switches = []
        
        for e in range(num_edge_per_pod):
            edge_switch = f'E{edge_id}'
            pod_edge_switches.append(edge_switch)
            pod_nodes[pod].add(edge_switch)
            
            for s in range(servers_per_edge):
                server = f'M{server_id}'
                G.add_edge(server, edge_switch, capacity=link_capacity)
                pod_nodes[pod].add(server)
                server_id += 1
            edge_id += 1
        
        for a in range(num_agg_per_pod):
            agg_switch = f'A{agg_id}'
            pod_agg_switches.append(agg_switch)
            pod_nodes[pod].add(agg_switch)
            agg_id += 1
        
        for edge in pod_edge_switches:
            for agg in pod_agg_switches:
                G.add_edge(edge, agg, capacity=link_capacity)
    
    core_switches = [f'S{i+1}' for i in range(num_core)]
    
    for pod in range(num_pods):
        for agg_idx in range(num_agg_per_pod):
            agg_switch = f'A{pod * num_agg_per_pod + agg_idx + 1}'
            for core_idx in range(num_agg_per_pod):
                core_switch = core_switches[agg_idx * num_agg_per_pod + core_idx]
                G.add_edge(agg_switch, core_switch, capacity=link_capacity)
    
    G.graph.update({'k': k, 'num_pods': num_pods, 'pod_nodes': pod_nodes, 
                    'core_switches': core_switches, 'total_servers': server_id - 1})
    return G

def analyze_topology(k=4, num_pods=None):
    G = build_fat_tree(k, num_pods)
    pod_nodes = G.graph['pod_nodes']
    core_switches = G.graph['core_switches']
    
    print(f"--- Fat Tree Topology Analysis ---")

    try:
        paths = list(nx.all_shortest_paths(G, 'M1', 'S1'))
        print(f"Q(a) Minimal paths M1 -> S1: {len(paths)}")
    except nx.NetworkXNoPath:
        print(f"Q(a) No path found between M1 and S1")

    if G.graph['total_servers'] >= 3:
        paths_intra = list(nx.all_simple_paths(G, 'M1', 'M3', cutoff=4))
        print(f"Q(b) Paths M1 -> M3: {len(paths_intra)}")

    if G.graph['num_pods'] >= 2:
        inter_dst = f'M{(k // 2) ** 2 + 1}'
        paths_inter = list(nx.all_simple_paths(G, 'M1', inter_dst, cutoff=7))
        print(f"Q(b) Paths M1 -> {inter_dst}: {len(paths_inter)}")
        
        if len(core_switches) >= 2:
            paths_through_s2 = sum(1 for p in paths_inter if 'S2' in p)
            print(f"Q(b) Paths M1 -> {inter_dst} through S2: {paths_through_s2}")

    half_pods = G.graph['num_pods'] // 2
    first_half = set()
    second_half = set()
    
    for pod_id, nodes in pod_nodes.items():
        (first_half if pod_id < half_pods else second_half).update(nodes)
    
    bisection_bw = sum(data['capacity'] for u, v, data in G.edges(data=True)
    if (u in first_half) != (v in first_half))
    
    print(f"Q(c) Bisection Bandwidth (single direction): {bisection_bw} Gbps")
    print(f"     Bisection Bandwidth (full duplex): {bisection_bw * 2} Gbps")
    print(f"     (Links crossing between Pod 1 and Pod 2 through core)")

if __name__ == "__main__":
    analyze_topology(k=4, num_pods=2)