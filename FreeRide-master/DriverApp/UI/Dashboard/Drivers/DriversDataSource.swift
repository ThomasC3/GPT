//
//  DriversDataSource.swift
//  FreeRide
//

import UIKit

class DriversDataSource: TableDataSource<DriverResponse> {

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(DriverTableViewCell.self)
    }

    func refresh(items: [DriverResponse]) {
        refresh()
        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(DriverTableViewCell.self, for: indexPath)
        cell.configure(with: item)
        
        return cell
    }
}
