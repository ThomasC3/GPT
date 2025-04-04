//
//  TipsDataSource.swift
//  FreeRide
//

import UIKit

class TipsDataSource: TableDataSource<GetTipsResponse> {

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(TipsTableViewCell.self)
    }
    
    func refresh(items: [GetTipsResponse]) {
        refresh()
        sections = [Section(rows: items)]
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)
        let cell = tableView.dequeueCell(TipsTableViewCell.self, for: indexPath)
        cell.configure(with: item)
        return cell
    }
    
}
