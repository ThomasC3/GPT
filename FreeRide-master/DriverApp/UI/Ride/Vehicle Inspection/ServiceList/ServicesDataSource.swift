//
//  ServicesDataSource.swift
//  FreeRide
//

import UIKit

class ServicesDataSource: TableDataSource<ServiceResponse> {

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(ServicesTableViewCell.self)
    }

    func refresh(items: [ServiceResponse]) {
        refresh()

        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(ServicesTableViewCell.self, for: indexPath)
        cell.configure(with: item)
        
        return cell
    }
}
