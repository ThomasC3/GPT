//
//  TipsViewController.swift
//  FreeRide
//

import UIKit

class TipsViewController: TableViewController {
 
    private lazy var dataSource: TipsDataSource = {
        let ds = TipsDataSource()
        return ds
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu
        title = "Your Tips"
        view.backgroundColor = Theme.Colors.backgroundGray
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadTips()
    }
    
    override func initializeTableView() {
        super.initializeTableView()
        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 116
    }
    
    private func loadTips() {
        context.api.getTips() { result in
            switch result {
            case .success(let response):
                self.dataSource.refresh(items: response)
                self.tableView.reloadData()
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
}

