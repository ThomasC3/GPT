//
//  VehiclesDataSource.swift
//  FreeRide
//

import UIKit

class VehiclesDataSource: TableDataSource<VehicleResponse> {

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(VehiclesTableViewCell.self)
    }

    func refresh(items: [VehicleResponse]) {
        refresh()
        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(VehiclesTableViewCell.self, for: indexPath)
        cell.configure(with: item)
        
        return cell
    }
}
